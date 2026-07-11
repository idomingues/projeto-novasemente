<?php

namespace App\Support;

use App\Models\CharityCampaign;
use App\Models\Church;
use App\Models\Culto;
use App\Models\DonationCampaign;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Musica;
use App\Models\News;
use App\Models\PhotoAlbum;
use App\Models\PrayerRequest;
use App\Models\RevistaAdventistaArticle;
use App\Services\DriveFolderCoverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class PublicationFeed
{
    public const PER_PAGE = 10;

    /** @var array<string, array{label: string, feature: string, description: string, action: string}> */
    public const TYPE_DEFINITIONS = [
        'news' => [
            'label' => 'Notícias',
            'feature' => 'news',
            'description' => 'Comunicado ou novidade publicada pela igreja.',
            'action' => 'Ler notícia',
        ],
        'culto' => [
            'label' => 'Assistir ao Vivo',
            'feature' => 'culto',
            'description' => 'Gravação ou transmissão de culto para assistir no app.',
            'action' => 'Assistir culto',
        ],
        'prayer' => [
            'label' => 'Pedido de Oração',
            'feature' => 'prayer',
            'description' => 'Pedido da comunidade para orarmos juntos.',
            'action' => 'Ver pedido',
        ],
        'health' => [
            'label' => 'Saúde',
            'feature' => 'health',
            'description' => 'Artigo ou material sobre saúde e bem-estar.',
            'action' => 'Ler conteúdo',
        ],
        'charity_donation' => [
            'label' => 'Doação',
            'feature' => 'charity_donations',
            'description' => 'Campanha para doar dinheiro ou objetos a quem precisa.',
            'action' => 'Ver campanha',
        ],
        'library' => [
            'label' => 'Biblioteca',
            'feature' => 'library',
            'description' => 'Livro, revista ou PDF disponível para leitura.',
            'action' => 'Abrir na biblioteca',
        ],
        'photos' => [
            'label' => 'Fotos',
            'feature' => 'photos',
            'description' => 'Álbum de fotos de eventos e momentos da igreja.',
            'action' => 'Ver álbum',
        ],
        'events' => [
            'label' => 'Eventos',
            'feature' => 'events',
            'description' => 'Atividade na agenda — cultos, encontros e programações.',
            'action' => 'Ver evento',
        ],
        'revista' => [
            'label' => 'Revista Adventista',
            'feature' => 'revista_adventista',
            'description' => 'Artigo da Revista Adventista para ler no app.',
            'action' => 'Ler artigo',
        ],
        'musica' => [
            'label' => 'Música',
            'feature' => 'musica',
            'description' => 'Música de louvor para cantar conosco.',
            'action' => 'Ouvir música',
        ],
        'donation_campaign' => [
            'label' => 'Oferta Nova Semente',
            'feature' => 'donation_campaigns',
            'description' => 'Campanha da Oferta Nova Semente para contribuir.',
            'action' => 'Ver campanha',
        ],
    ];

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function typeOptionsForChurch(?Church $church): array
    {
        $options = [];
        foreach (self::TYPE_DEFINITIONS as $key => $definition) {
            if ($church !== null && ! ChurchAppFeatures::isEnabled($church, $definition['feature'])) {
                continue;
            }
            $options[] = [
                'value' => $key,
                'label' => $definition['label'],
                'description' => $definition['description'],
            ];
        }

        return $options;
    }

    /**
     * @return array{
     *     items: array{
     *         data: list<array<string, mixed>>,
     *         current_page: int,
     *         has_more: bool,
     *         next_page: int|null
     *     },
     *     typeOptions: list<array{value: string, label: string}>,
     *     filters: array{type: string|null, sort: string}
     * }
     */
    public static function paginatedForRequest(Request $request, ?int $churchId, ?int $perPage = null): array
    {
        $page = max(1, (int) $request->query('page', 1));
        $church = $churchId !== null ? Church::query()->find($churchId) : null;
        $typeFilter = trim((string) $request->query('type', ''));
        if ($typeFilter !== '' && ! array_key_exists($typeFilter, self::TYPE_DEFINITIONS)) {
            $typeFilter = '';
        }
        $sort = (string) $request->query('sort', 'recent');
        if (! in_array($sort, ['recent', 'oldest'], true)) {
            $sort = 'recent';
        }

        $baseUrl = rtrim($request->getSchemeAndHttpHost(), '/');
        $driveCover = app(DriveFolderCoverService::class);
        $items = self::collectItems($church, $churchId, $typeFilter, $baseUrl, $driveCover);
        $items = self::sortItems($items, $sort);

        // Página 1: todos do mês atual (mín. 10). Demais páginas: +10.
        [$slice, $hasMore, $nextPage] = self::paginateForFeed($items, $page, $sort);

        return [
            'items' => [
                'data' => $slice,
                'current_page' => $page,
                'has_more' => $hasMore,
                'next_page' => $nextPage,
            ],
            'typeOptions' => self::typeOptionsForChurch($church),
            'filters' => [
                'type' => $typeFilter !== '' ? $typeFilter : null,
                'sort' => $sort,
            ],
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return array{0: list<array<string, mixed>>, 1: bool, 2: int|null}
     */
    private static function paginateForFeed(Collection $items, int $page, string $sort): array
    {
        $total = $items->count();
        if ($total === 0) {
            return [[], false, null];
        }

        $firstPageSize = self::PER_PAGE;
        if ($sort === 'recent') {
            $monthStart = Carbon::now('America/Sao_Paulo')->startOfMonth();
            $monthCount = $items->filter(function (array $item) use ($monthStart) {
                $at = $item['published_at'] ?? null;
                if (! is_string($at) || $at === '') {
                    return false;
                }

                try {
                    return Carbon::parse($at)->timezone('America/Sao_Paulo')->gte($monthStart);
                } catch (\Throwable) {
                    return false;
                }
            })->count();

            // Todos do mês, ou pelo menos as 10 mais recentes.
            $firstPageSize = max(self::PER_PAGE, $monthCount);
        }

        if ($page <= 1) {
            $slice = $items->take($firstPageSize)->values()->all();
            $hasMore = $total > $firstPageSize;

            return [$slice, $hasMore, $hasMore ? 2 : null];
        }

        $offset = $firstPageSize + ($page - 2) * self::PER_PAGE;
        $slice = $items->slice($offset, self::PER_PAGE)->values()->all();
        $hasMore = $offset + self::PER_PAGE < $total;

        return [$slice, $hasMore, $hasMore ? $page + 1 : null];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectItems(
        ?Church $church,
        ?int $churchId,
        string $typeFilter,
        string $baseUrl,
        DriveFolderCoverService $driveCover,
    ): Collection {
        $items = collect();

        foreach (self::TYPE_DEFINITIONS as $type => $definition) {
            if ($typeFilter !== '' && $typeFilter !== $type) {
                continue;
            }
            if ($church !== null && ! ChurchAppFeatures::isEnabled($church, $definition['feature'])) {
                continue;
            }

            $items = $items->concat(match ($type) {
                'news' => self::collectNews($church, $churchId, News::SECTION_NEWS, 'news', $baseUrl),
                'health' => self::collectNews($church, $churchId, News::SECTION_HEALTH, 'health', $baseUrl),
                'culto' => self::collectCultos($church, $churchId, $baseUrl),
                'prayer' => self::collectPrayerRequests($church, $churchId, $baseUrl),
                'charity_donation' => self::collectCharityCampaigns($church, $churchId, $baseUrl),
                'library' => self::collectLibraryBooks($church, $churchId, $baseUrl),
                'photos' => self::collectPhotoAlbums($church, $churchId, $driveCover, $baseUrl),
                'events' => self::collectEvents($church, $churchId, $baseUrl),
                'revista' => self::collectRevistaArticles($church, $baseUrl),
                'musica' => self::collectMusicas($church, $churchId, $baseUrl),
                'donation_campaign' => self::collectDonationCampaigns($church, $churchId, $baseUrl),
                default => collect(),
            });
        }

        return $items;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectNews(
        ?Church $church,
        ?int $churchId,
        string $section,
        string $routePrefix,
        string $baseUrl,
    ): Collection {
        if ($churchId === null) {
            return collect();
        }

        $showRoute = $routePrefix === 'health' ? 'mobile.health.show' : 'mobile.news.show';
        $param = $routePrefix === 'health' ? 'health' : 'news';

        return News::query()
            ->with('author')
            ->where('church_id', $churchId)
            ->where('section', $section)
            ->visibleToPublic()
            ->orderByDesc('published_at')
            ->limit(100)
            ->get()
            ->map(function (News $post) use ($showRoute, $param, $baseUrl, $routePrefix, $church) {
                $typeKey = $routePrefix === 'health' ? 'health' : 'news';
                $meta = [self::newsFormatLabel($post)];
                if ($post->author?->name) {
                    $meta[] = 'Por '.$post->author->name;
                }

                $cover = $typeKey === 'health'
                    ? PublicationFeedCoverResolver::forHealth($post, $baseUrl, $church)
                    : PublicationFeedCoverResolver::forNews($post, $baseUrl, $church);

                $instagramUrl = trim((string) ($post->instagram_url ?? ''));

                return self::entry(
                    type: $typeKey,
                    typeLabel: self::TYPE_DEFINITIONS[$typeKey]['label'],
                    pk: $post->id,
                    title: $post->title,
                    excerpt: self::plainText($post->excerpt, $post->body),
                    imageUrl: $cover,
                    publishedAt: $post->published_at,
                    href: route($showRoute, [$param => $post->slug], absolute: false),
                    meta: $meta,
                    coverPlayOverlay: PublicationFeedCoverResolver::newsShowsPlayOverlay($post),
                    body: self::fullContent($post->body, $post->excerpt),
                    bodyIsHtml: self::looksLikeHtml((string) ($post->body ?? '')),
                    requiresOpen: in_array($post->content_type, [
                        News::TYPE_PDF,
                        News::TYPE_YOUTUBE,
                    ], true),
                    instagramUrl: $instagramUrl !== '' ? $instagramUrl : null,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectCultos(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return Culto::query()
            ->where('church_id', $churchId)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->limit(100)
            ->get()
            ->map(fn (Culto $culto) => self::entry(
                type: 'culto',
                typeLabel: self::TYPE_DEFINITIONS['culto']['label'],
                pk: $culto->id,
                title: $culto->title,
                excerpt: 'Assista à gravação ou transmissão deste culto quando quiser.',
                imageUrl: PublicationFeedCoverResolver::forCulto($culto, $church, $baseUrl),
                publishedAt: $culto->published_at,
                href: route('mobile.culto.show', ['culto' => $culto->id], absolute: false),
                meta: ['Vídeo no YouTube', 'Culto online'],
                coverPlayOverlay: PublicationFeedCoverResolver::cultoShowsPlayOverlay($culto),
                body: 'Assista à gravação ou transmissão deste culto quando quiser.',
                requiresOpen: true,
            ));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectPrayerRequests(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return PrayerRequest::query()
            ->where('church_id', $churchId)
            ->where('active', true)
            ->where('needs_review', false)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (PrayerRequest $prayer) use ($church, $baseUrl) {
                return self::entry(
                    type: 'prayer',
                    typeLabel: self::TYPE_DEFINITIONS['prayer']['label'],
                    pk: $prayer->id,
                    title: 'Alguém precisa da sua oração',
                    excerpt: '',
                    imageUrl: PublicationFeedCoverResolver::forPrayer($church, $baseUrl),
                    publishedAt: $prayer->created_at,
                    href: route('mobile.prayer', absolute: false),
                    meta: [],
                    allowExcerptFallback: false,
                    body: trim((string) ($prayer->request ?? '')),
                    requiresOpen: true,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectCharityCampaigns(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return CharityCampaign::query()
            ->with(['storyPhotos' => fn ($q) => $q->orderBy('sort_order')->limit(1)])
            ->where('church_id', $churchId)
            ->where(function ($q) {
                $q->where(function ($active) {
                    $active->where('status', CharityCampaign::STATUS_ACTIVE)
                        ->where(function ($dates) {
                            $dates->whereNull('ends_at')->orWhereDate('ends_at', '>=', now()->toDateString());
                        });
                })->orWhere('status', CharityCampaign::STATUS_CLOSED);
            })
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (CharityCampaign $campaign) use ($church, $baseUrl) {
                $meta = [
                    $campaign->isItemCampaign() ? 'Doação de objetos' : 'Doação em dinheiro',
                    $campaign->status === CharityCampaign::STATUS_CLOSED ? 'Campanha encerrada' : 'Campanha ativa',
                ];

                return self::entry(
                    type: 'charity_donation',
                    typeLabel: self::TYPE_DEFINITIONS['charity_donation']['label'],
                    pk: $campaign->id,
                    title: $campaign->title,
                    excerpt: self::plainText($campaign->description),
                    imageUrl: PublicationFeedCoverResolver::forCharityCampaign($campaign, $church, $baseUrl),
                    publishedAt: $campaign->created_at,
                    href: route('mobile.donations.show', ['charityCampaign' => $campaign->id], absolute: false),
                    meta: $meta,
                    coverPlayOverlay: PublicationFeedCoverResolver::charityShowsPlayOverlay($campaign),
                    body: self::fullContent($campaign->description),
                    requiresOpen: true,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectLibraryBooks(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        return LibraryBook::query()
            ->forMobileLibrary($churchId)
            ->visibleInApp()
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (LibraryBook $book) use ($baseUrl, $church) {
                $meta = [self::libraryCategoryLabel((string) $book->category)];
                if (filled($book->subtitle)) {
                    $meta[] = (string) $book->subtitle;
                }

                return self::entry(
                    type: 'library',
                    typeLabel: self::TYPE_DEFINITIONS['library']['label'],
                    pk: $book->id,
                    title: $book->title,
                    excerpt: self::plainText($book->description) ?: 'Material disponível para leitura ou download.',
                    imageUrl: PublicationFeedCoverResolver::forLibraryBook($book, $baseUrl, $church),
                    publishedAt: $book->published_at ?? $book->created_at,
                    href: route('mobile.biblioteca.show', ['libraryBook' => $book->id], absolute: false),
                    meta: $meta,
                    body: self::fullContent($book->description) ?: 'Material disponível para leitura ou download.',
                    requiresOpen: true,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectPhotoAlbums(
        ?Church $church,
        ?int $churchId,
        DriveFolderCoverService $driveCover,
        string $baseUrl,
    ): Collection {
        if ($churchId === null) {
            return collect();
        }

        return PhotoAlbum::query()
            ->where('church_id', $churchId)
            ->visibleInApp()
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (PhotoAlbum $album) use ($driveCover, $church, $baseUrl) {
                $meta = ['Álbum de fotos'];
                if (filled($album->photographer_name)) {
                    $meta[] = 'Fotógrafo: '.$album->photographer_name;
                }

                return self::entry(
                    type: 'photos',
                    typeLabel: self::TYPE_DEFINITIONS['photos']['label'],
                    pk: $album->id,
                    title: $album->title,
                    excerpt: filled($album->photographer_name)
                        ? 'Registros fotográficos por '.$album->photographer_name.'.'
                        : 'Confira as fotos deste momento da igreja.',
                    imageUrl: PublicationFeedCoverResolver::forPhotoAlbum($album, $driveCover, $church, $baseUrl),
                    publishedAt: $album->published_at ?? $album->created_at,
                    href: route('mobile.fotos.show', ['album' => $album->id], absolute: false),
                    meta: $meta,
                    body: filled($album->photographer_name)
                        ? 'Registros fotográficos por '.$album->photographer_name.'.'
                        : 'Confira as fotos deste momento da igreja.',
                    requiresOpen: true,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectEvents(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return Event::query()
            ->where('church_id', $churchId)
            ->visibleToPublic()
            ->orderByDesc('published_at')
            ->limit(100)
            ->get()
            ->map(function (Event $event) use ($baseUrl, $church) {
                $meta = [];
                $when = self::formatEventWhen($event);
                if ($when !== null) {
                    $meta[] = $when;
                }
                if (filled($event->location)) {
                    $meta[] = (string) $event->location;
                }
                if ($event->video_type === Event::VIDEO_YOUTUBE) {
                    $meta[] = 'Com vídeo';
                }

                return self::entry(
                    type: 'events',
                    typeLabel: self::TYPE_DEFINITIONS['events']['label'],
                    pk: $event->id,
                    title: $event->title,
                    excerpt: self::plainText($event->description) ?: 'Confira data, horário e detalhes deste evento na agenda.',
                    imageUrl: PublicationFeedCoverResolver::forEvent($event, $baseUrl, $church),
                    publishedAt: $event->published_at,
                    href: route('mobile.events', absolute: false).'?event='.$event->id,
                    meta: $meta,
                    coverPlayOverlay: PublicationFeedCoverResolver::eventShowsPlayOverlay($event),
                    body: self::fullContent($event->description),
                    requiresOpen: true,
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectRevistaArticles(?Church $church, string $baseUrl): Collection
    {
        return RevistaAdventistaArticle::query()
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->limit(100)
            ->get()
            ->map(function (RevistaAdventistaArticle $article) use ($church, $baseUrl) {
                $meta = [$article->sectionLabel()];
                if (filled($article->author_name)) {
                    $meta[] = 'Por '.$article->author_name;
                }

                return self::entry(
                    type: 'revista',
                    typeLabel: self::TYPE_DEFINITIONS['revista']['label'],
                    pk: $article->id,
                    title: $article->title,
                    excerpt: self::plainText($article->excerpt, $article->body),
                    imageUrl: PublicationFeedCoverResolver::forRevista($article, $church, $baseUrl),
                    publishedAt: $article->published_at,
                    href: route('mobile.revista-adventista.show', ['revistaAdventistaArticle' => $article->slug], absolute: false),
                    meta: $meta,
                    body: self::fullContent($article->body, $article->excerpt),
                    bodyIsHtml: self::looksLikeHtml((string) ($article->body ?? '')),
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectMusicas(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return Musica::query()
            ->where('church_id', $churchId)
            ->visibleInApp()
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (Musica $musica) => self::entry(
                type: 'musica',
                typeLabel: self::TYPE_DEFINITIONS['musica']['label'],
                pk: $musica->id,
                title: $musica->title,
                excerpt: 'Música de louvor para acompanhar e cantar conosco.',
                imageUrl: PublicationFeedCoverResolver::forMusica($musica, $church, $baseUrl),
                publishedAt: $musica->published_at ?? $musica->created_at,
                href: route('mobile.musica.show', ['musica' => $musica->id], absolute: false),
                meta: ['Vídeo no YouTube', 'Louvor'],
                coverPlayOverlay: PublicationFeedCoverResolver::musicaShowsPlayOverlay($musica),
                body: 'Música de louvor para acompanhar e cantar conosco.',
                requiresOpen: true,
            ));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private static function collectDonationCampaigns(?Church $church, ?int $churchId, string $baseUrl): Collection
    {
        if ($churchId === null) {
            return collect();
        }

        return DonationCampaign::query()
            ->with(['storyPhotos' => fn ($q) => $q->orderBy('sort_order')->limit(1)])
            ->where('church_id', $churchId)
            ->where(function ($q) {
                $q->where(function ($active) {
                    $active->where('status', DonationCampaign::STATUS_ACTIVE)
                        ->where(function ($dates) {
                            $dates->whereNull('ends_at')->orWhereDate('ends_at', '>=', now()->toDateString());
                        });
                })->orWhere('status', DonationCampaign::STATUS_CLOSED);
            })
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(function (DonationCampaign $campaign) use ($church, $baseUrl) {
                $meta = [
                    $campaign->status === DonationCampaign::STATUS_CLOSED ? 'Campanha encerrada' : 'Campanha ativa',
                ];
                if ($campaign->goal_amount > 0) {
                    $meta[] = 'Meta R$ '.number_format((float) $campaign->goal_amount, 2, ',', '.');
                }

                return self::entry(
                    type: 'donation_campaign',
                    typeLabel: self::TYPE_DEFINITIONS['donation_campaign']['label'],
                    pk: $campaign->id,
                    title: $campaign->title,
                    excerpt: self::plainText($campaign->description),
                    imageUrl: PublicationFeedCoverResolver::forDonationCampaign($campaign, $church, $baseUrl),
                    publishedAt: $campaign->created_at,
                    href: route('mobile.campaigns.show', ['donationCampaign' => $campaign->id], absolute: false),
                    meta: $meta,
                    coverPlayOverlay: PublicationFeedCoverResolver::donationShowsPlayOverlay($campaign),
                    body: self::fullContent($campaign->description),
                    requiresOpen: true,
                );
            });
    }

    /**
     * @param  list<string>  $meta
     * @return array<string, mixed>
     */
    private static function entry(
        string $type,
        string $typeLabel,
        int $pk,
        string $title,
        string $excerpt,
        ?string $imageUrl,
        ?\DateTimeInterface $publishedAt,
        string $href,
        array $meta = [],
        bool $coverPlayOverlay = false,
        bool $allowExcerptFallback = true,
        ?string $body = null,
        bool $bodyIsHtml = false,
        bool $requiresOpen = false,
        ?string $instagramUrl = null,
    ): array {
        $definition = self::TYPE_DEFINITIONS[$type] ?? null;
        $resolvedExcerpt = $excerpt !== '' ? $excerpt : (
            $allowExcerptFallback ? ($definition['description'] ?? 'Toque para abrir na app.') : ''
        );
        $resolvedBody = trim((string) ($body ?? ''));
        if ($resolvedBody === '') {
            $resolvedBody = $resolvedExcerpt;
        }
        $resolvedInstagram = trim((string) ($instagramUrl ?? ''));

        return [
            'id' => $type.'-'.$pk,
            'type' => $type,
            'type_label' => $typeLabel,
            'type_description' => $definition['description'] ?? '',
            'action_label' => $definition['action'] ?? 'Abrir',
            'title' => $title,
            'excerpt' => $resolvedExcerpt,
            'body' => $resolvedBody,
            'body_is_html' => $bodyIsHtml,
            'requires_open' => $requiresOpen,
            'instagram_url' => $resolvedInstagram !== '' ? $resolvedInstagram : null,
            'image_url' => $imageUrl,
            'cover_play_overlay' => $coverPlayOverlay,
            'published_at' => $publishedAt?->format(\DateTimeInterface::ATOM),
            'href' => $href,
            'meta' => array_values(array_filter($meta, fn ($line) => is_string($line) && trim($line) !== '')),
        ];
    }

    private static function newsFormatLabel(News $post): string
    {
        return match ($post->content_type) {
            News::TYPE_YOUTUBE => 'Vídeo no YouTube',
            News::TYPE_PDF => 'Documento PDF',
            News::TYPE_IMAGE => 'Imagem',
            News::TYPE_INSTAGRAM_FEED => 'Publicação estilo feed',
            News::TYPE_INSTAGRAM_LINK => 'Link do Instagram',
            default => 'Artigo',
        };
    }

    private static function libraryCategoryLabel(string $category): string
    {
        return match ($category) {
            LibraryBook::CATEGORY_BOOKS => 'Livro',
            LibraryBook::CATEGORY_MAGAZINES => 'Revista',
            LibraryBook::CATEGORY_MEDITATION => 'Meditação',
            LibraryBook::CATEGORY_LESSON => 'Lição',
            LibraryBook::CATEGORY_EGW => 'Ellen G. White',
            default => 'Biblioteca',
        };
    }

    private static function formatEventWhen(Event $event): ?string
    {
        if ($event->starts_at === null) {
            return null;
        }

        $starts = Carbon::parse($event->starts_at)->timezone('America/Sao_Paulo');

        if ($event->all_day) {
            return $starts->translatedFormat('d \d\e M Y').' · Dia inteiro';
        }

        return $starts->translatedFormat('d \d\e M Y · H:i');
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     * @return Collection<int, array<string, mixed>>
     */
    private static function sortItems(Collection $items, string $sort): Collection
    {
        return $items->sortBy(
            fn (array $item) => $item['published_at'] ?? '',
            SORT_REGULAR,
            $sort === 'recent',
        )->values();
    }

    private static function plainText(?string $primary, ?string $fallback = null): string
    {
        $text = trim((string) $primary);
        if ($text === '') {
            $plain = trim(preg_replace('/\s+/u', ' ', strip_tags((string) ($fallback ?? ''))) ?? '');
            $text = $plain;
        }

        return $text !== '' ? Str::limit($text, 240) : '';
    }

    private static function fullContent(?string $primary, ?string $fallback = null): string
    {
        $text = trim((string) ($primary ?? ''));
        if ($text !== '') {
            return $text;
        }

        return trim((string) ($fallback ?? ''));
    }

    private static function looksLikeHtml(string $text): bool
    {
        $t = trim($text);
        if ($t === '') {
            return false;
        }

        return (bool) preg_match('/<\/?[a-z][a-z0-9]*\b/i', $t);
    }
}
