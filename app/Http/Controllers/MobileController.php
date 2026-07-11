<?php

namespace App\Http\Controllers;

use App\Models\AcervoItem;
use App\Models\AppNotification;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\ChurchSolicitation;
use App\Models\Culto;
use App\Models\Event;
use App\Models\LibraryBook;
use App\Models\Ministry;
use App\Models\Musica;
use App\Models\News;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\PhotoAlbum;
use App\Models\RevistaAdventistaArticle;
use App\Models\RevistaAdventistaEdition;
use App\Models\ScheduleCheckinDate;
use App\Models\User;
use App\Models\UserDismissedAppNotification;
use App\Models\UserHomeCardBookmark;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Services\DriveFolderCoverService;
use App\Services\DriveFolderImagesService;
use App\Services\LibraryEgwPdfService;
use App\Services\RevistaAdventistaEditionPdfService;
use App\Services\LibraryExternalPageExtractService;
use App\Services\SabbathSunsetService;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\SolicitationChatNotifier;
use App\Services\VolunteerScheduleOverview;
use App\Services\YoutubePlaylistImportService;
use App\Support\ChurchAppFeatures;
use App\Support\HomeCardKeys;
use App\Support\HomeFeaturedWeek;
use App\Support\NotificationFeed;
use App\Support\PublicationFeed;
use App\Support\PublicationsFeedAccess;
use App\Support\ScheduleBoardViewData;
use App\Support\SolicitationAssignees;
use App\Support\VolunteerSignupCompletion;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MobileController extends Controller
{
    private function currentChurch(): ?Church
    {
        $id = Church::resolveWorkingId(request());

        return $id !== null ? Church::query()->whereKey($id)->first() : null;
    }

    private function normalizedLibraryExternalUrl(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * Exclui eventos já terminados: com `ends_at` no passado, ou sem `ends_at` e início antes do dia atual.
     *
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    private function whereEventNotPast(Builder $query): Builder
    {
        $now = now();

        return $query->where(function ($q) use ($now) {
            $q->where(function ($inner) use ($now) {
                $inner->whereNotNull('ends_at')->where('ends_at', '>=', $now);
            })->orWhere(function ($inner) use ($now) {
                $inner->whereNull('ends_at')->where('starts_at', '>=', $now->copy()->startOfDay());
            });
        });
    }

    public function index(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;

        $baseUrl = request()->getSchemeAndHttpHost();
        $latestNews = News::query()
            ->where('section', News::SECTION_NEWS)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->limit(3)
            ->get()
            ->map(function (News $n) use ($baseUrl) {
                $imageUrl = $n->image_url;
                if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                    $imageUrl = $baseUrl.$imageUrl;
                }

                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'slug' => $n->slug,
                    'excerpt' => $n->excerpt,
                    'content_type' => $n->content_type ?? News::TYPE_ARTICLE,
                    'image_url' => $imageUrl,
                    'cover_url' => $n->resolvedCoverUrl($baseUrl),
                    'published_at' => $n->published_at?->toIso8601String(),
                ];
            });

        $upcomingEvents = $this->whereEventNotPast(
            Event::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
                ->visibleToPublic()
        )
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'starts_at' => $e->starts_at->toIso8601String(),
                'ends_at' => $e->ends_at?->toIso8601String(),
                'all_day' => $e->all_day,
                'location' => $e->location,
                'price' => $e->price,
            ]);

        return Inertia::render('Mobile/Index', [
            'church' => $church ? [
                'name' => $church->name,
                'logo_url' => $church->logo_url,
                'city' => $church->city,
                'state' => $church->state,
                'whatsapp' => $church->whatsapp,
            ] : null,
            'latestNews' => $latestNews,
            'upcomingEvents' => $upcomingEvents,
        ]);
    }

    /**
     * Início da app (substitui News como tela principal): atalhos + últimas notícias.
     */
    public function home(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;
        $baseUrl = $request->getSchemeAndHttpHost();

        $latestNews = News::query()
            ->where('section', News::SECTION_NEWS)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->limit(5)
            ->get()
            ->map(function (News $n) use ($baseUrl) {
                $imageUrl = $n->image_url;
                if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                    $imageUrl = $baseUrl.$imageUrl;
                }
                $type = $n->content_type ?? News::TYPE_ARTICLE;
                $typeLabel = match ($type) {
                    News::TYPE_YOUTUBE => 'VÍDEO',
                    News::TYPE_PDF => 'PDF',
                    News::TYPE_IMAGE => 'IMAGEM',
                    News::TYPE_INSTAGRAM_FEED => 'FEED',
                    News::TYPE_INSTAGRAM_LINK => 'INSTAGRAM',
                    default => 'NOTÍCIA',
                };

                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'slug' => $n->slug,
                    'excerpt' => $n->excerpt,
                    'content_type' => $type,
                    'type_label' => $typeLabel,
                    'instagram_url' => $n->instagram_url,
                    'image_url' => $imageUrl,
                    'cover_url' => $n->resolvedCoverUrl($baseUrl),
                    'published_at' => $n->published_at?->toIso8601String(),
                ];
            });

        $upcomingEvents = $this->whereEventNotPast(
            Event::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
                ->visibleToPublic()
        )
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(function (Event $e) use ($baseUrl) {
                $imageUrl = $e->image_url;
                if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                    $imageUrl = $baseUrl.$imageUrl;
                }

                return [
                    'id' => $e->id,
                    'title' => $e->title,
                    'description' => $e->description,
                    'starts_at' => $e->starts_at->toIso8601String(),
                    'ends_at' => $e->ends_at?->toIso8601String(),
                    'all_day' => $e->all_day,
                    'location' => $e->location,
                    'price' => $e->price,
                    'purchase_url' => $e->purchase_url,
                    'video_type' => $e->video_type,
                    'video_url' => $e->video_url,
                    'youtube_embed_url' => $e->youtube_embed_url,
                    'image_url' => $imageUrl,
                    'color' => $e->color,
                ];
            });

        $user = $request->user();
        $volunteerSignupCompletion = $user !== null
            ? VolunteerSignupCompletion::profileAlertForUser($user)
            : null;

        $sabbathBanner = app(SabbathSunsetService::class)->homeBannerPayload();
        $weeklyProgramCards = app(\App\Services\WeeklyProgramService::class)->homeCards($church);
        $featuredWeek = HomeFeaturedWeek::forChurch($church);
        $bookmarkedHomeCards = [];
        if ($user !== null && Schema::hasTable('user_home_card_bookmarks')) {
            $bookmarkedHomeCards = UserHomeCardBookmark::query()
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->pluck('card_key')
                ->values()
                ->all();
        }

        return Inertia::render('Mobile/Home', [
            'latestNews' => $latestNews,
            'upcomingEvents' => $upcomingEvents,
            'showPostRegistrationBanner' => $request->boolean('reg_ok') && $request->user() !== null,
            'volunteerSignupCompletion' => $volunteerSignupCompletion,
            'sabbathBanner' => $weeklyProgramCards === [] ? $sabbathBanner : null,
            'weeklyProgramCards' => $weeklyProgramCards,
            'featuredWeek' => $featuredWeek,
            'bookmarkedHomeCards' => $bookmarkedHomeCards,
        ]);
    }

    public function toggleHomeCardBookmark(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $data = $request->validate([
            'card_key' => ['required', 'string', 'max:64'],
        ]);
        $cardKey = trim((string) $data['card_key']);
        abort_unless(HomeCardKeys::isAllowed($cardKey), 422);

        $existing = UserHomeCardBookmark::query()
            ->where('user_id', $user->id)
            ->where('card_key', $cardKey)
            ->first();

        if ($existing !== null) {
            $existing->delete();
            $bookmarked = false;
        } else {
            UserHomeCardBookmark::query()->create([
                'user_id' => $user->id,
                'card_key' => $cardKey,
            ]);
            $bookmarked = true;
        }

        $keys = UserHomeCardBookmark::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->pluck('card_key')
            ->values()
            ->all();

        return response()->json([
            'bookmarked' => $bookmarked,
            'bookmarkedHomeCards' => $keys,
        ]);
    }

    public function meditacaoDiaria(Request $request): Response
    {
        $church = $this->currentChurch();
        $url = $church !== null ? $church->resolvedLibraryMeditationUrl() : Church::DEFAULT_LIBRARY_MEDITATION_URL;

        /** @var LibraryExternalPageExtractService $svc */
        $svc = app(LibraryExternalPageExtractService::class);
        $result = $svc->fetchAndExtract($url, 'meditation');

        return Inertia::render('Mobile/MeditationDaily', [
            'ok' => ! empty($result['ok']),
            'html' => (string) ($result['html'] ?? ''),
            'error' => (string) ($result['error'] ?? ''),
            'sourceUrl' => $url,
        ]);
    }

    public function culto(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;
        $cultos = Culto::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->get()
            ->map(fn (Culto $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'youtube_url' => $c->youtube_url,
                'youtube_embed_url' => $c->youtube_embed_url,
                'youtube_thumb_url' => $c->youtube_thumb_url,
                'published_at' => $c->published_at?->toIso8601String(),
            ]);

        $liveCulto = null;
        if ($church) {
            $raw = trim((string) ($church->youtube_live_url ?? ''));
            if ($raw !== '') {
                $videoId = Culto::youtubeVideoId($raw);
                if ($videoId) {
                    $liveCulto = [
                        'title' => 'AO VIVO',
                        'youtube_url' => str_contains($raw, 'http') ? $raw : "https://www.youtube.com/watch?v={$videoId}",
                        'youtube_embed_url' => "https://www.youtube.com/embed/{$videoId}",
                        'youtube_thumb_url' => "https://img.youtube.com/vi/{$videoId}/mqdefault.jpg",
                    ];
                }
            }
        }

        return Inertia::render('Mobile/Culto', [
            'cultos' => $cultos,
            'liveCulto' => $liveCulto,
            'showPostRegistrationBanner' => $request->boolean('reg_ok') && $request->user() !== null,
        ]);
    }

    public function cultoShow(Request $request, Culto $culto): Response
    {
        $churchId = $this->currentChurch()?->id;
        if ($churchId === null || (int) $culto->church_id !== (int) $churchId) {
            abort(404);
        }
        if ($culto->published_at === null || $culto->published_at->isFuture()) {
            abort(404);
        }

        return Inertia::render('Mobile/CultoShow', [
            'culto' => [
                'id' => $culto->id,
                'title' => $culto->title,
                'youtube_url' => $culto->youtube_url,
                'youtube_embed_url' => $culto->youtube_embed_url,
                'published_at' => $culto->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function musica(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $musicas = Musica::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->visibleInApp()
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->get()
            ->map(fn (Musica $m) => [
                'id' => $m->id,
                'title' => $m->title,
                'youtube_url' => $m->youtube_url,
                'youtube_embed_url' => $m->youtube_embed_url,
                'youtube_thumb_url' => $m->youtube_thumb_url,
                'published_at' => $m->published_at?->toIso8601String(),
            ]);

        return Inertia::render('Mobile/Music', [
            'musicas' => $musicas,
        ]);
    }

    public function musicaShow(Request $request, Musica $musica): Response
    {
        $churchId = $this->currentChurch()?->id;
        if ($churchId === null || $musica->church_id !== $churchId) {
            abort(404);
        }
        if ($musica->published_at !== null && $musica->published_at->isFuture()) {
            abort(404);
        }

        return Inertia::render('Mobile/MusicShow', [
            'musica' => [
                'id' => $musica->id,
                'title' => $musica->title,
                'youtube_url' => $musica->youtube_url,
                'youtube_embed_url' => $musica->youtube_embed_url,
                'published_at' => $musica->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function news(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $baseUrl = request()->getSchemeAndHttpHost();

        $mapPost = function (News $p) use ($baseUrl): array {
            $imageUrl = $p->image_url;
            if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                $imageUrl = $baseUrl.$imageUrl;
            }

            $author = null;
            if ($p->relationLoaded('author') && $p->author !== null) {
                $photoUrl = $p->author->photo_url;
                if ($photoUrl && ! str_starts_with($photoUrl, 'http')) {
                    $photoUrl = $baseUrl.$photoUrl;
                }
                $author = [
                    'name' => (string) $p->author->name,
                    'photo_url' => $photoUrl,
                ];
            }

            return [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'excerpt' => $p->excerpt,
                'body' => $p->body,
                'content_type' => $p->content_type ?? News::TYPE_ARTICLE,
                'youtube_url' => $p->youtube_url,
                'youtube_embed_url' => $p->youtube_embed_url,
                'instagram_url' => $p->instagram_url,
                'pdf_url' => $p->resolvedPdfUrl($baseUrl),
                'video_url' => $p->resolvedVideoUrl($baseUrl),
                'has_video' => (bool) $p->has_video,
                'image_url' => $imageUrl,
                'cover_url' => $p->resolvedCoverUrl($baseUrl),
                'published_at' => $p->published_at?->toIso8601String(),
                'author' => $author,
            ];
        };

        $posts = News::query()
            ->with(['author:id,name,photo_url'])
            ->where('section', News::SECTION_NEWS)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->paginate(15)
            ->withQueryString();

        $posts->getCollection()->transform(fn (News $p) => $mapPost($p));

        return Inertia::render('Mobile/News', [
            'posts' => $posts,
        ]);
    }

    public function newsShow(Request $request, News $news): Response
    {
        $churchId = $this->currentChurch()?->id;
        if ($churchId === null || $news->church_id !== $churchId) {
            abort(404);
        }
        if ($news->section !== News::SECTION_NEWS) {
            abort(404);
        }
        if (! $news->is_active) {
            abort(404);
        }
        if ($news->published_at === null || $news->published_at->isFuture()) {
            abort(404);
        }

        $news->loadMissing(['author:id,name,photo_url']);

        $baseUrl = request()->getSchemeAndHttpHost();
        $imageUrl = $news->image_url;
        if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
            $imageUrl = $baseUrl.$imageUrl;
        }

        $author = null;
        if ($news->author !== null) {
            $photoUrl = $news->author->photo_url;
            if ($photoUrl && ! str_starts_with($photoUrl, 'http')) {
                $photoUrl = $baseUrl.$photoUrl;
            }
            $author = [
                'name' => (string) $news->author->name,
                'photo_url' => $photoUrl,
            ];
        }

        return Inertia::render('Mobile/NewsShow', [
            'post' => [
                'id' => $news->id,
                'title' => $news->title,
                'slug' => $news->slug,
                'excerpt' => $news->excerpt,
                'body' => $news->body,
                'content_type' => $news->content_type ?? News::TYPE_ARTICLE,
                'youtube_url' => $news->youtube_url,
                'youtube_embed_url' => $news->youtube_embed_url,
                'instagram_url' => $news->instagram_url,
                'pdf_url' => $news->resolvedPdfUrl($baseUrl),
                'video_url' => $news->resolvedVideoUrl($baseUrl),
                'has_video' => (bool) $news->has_video,
                'image_url' => $imageUrl,
                'cover_url' => $news->resolvedCoverUrl($baseUrl),
                'published_at' => $news->published_at?->toIso8601String(),
                'author' => $author,
            ],
        ]);
    }

    public function health(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $baseUrl = request()->getSchemeAndHttpHost();

        $mapPost = function (News $p) use ($baseUrl): array {
            $imageUrl = $p->image_url;
            if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                $imageUrl = $baseUrl.$imageUrl;
            }

            $author = null;
            if ($p->relationLoaded('author') && $p->author !== null) {
                $photoUrl = $p->author->photo_url;
                if ($photoUrl && ! str_starts_with($photoUrl, 'http')) {
                    $photoUrl = $baseUrl.$photoUrl;
                }
                $author = [
                    'name' => (string) $p->author->name,
                    'photo_url' => $photoUrl,
                ];
            }

            return [
                'id' => $p->id,
                'title' => $p->title,
                'slug' => $p->slug,
                'excerpt' => $p->excerpt,
                'body' => $p->body,
                'content_type' => $p->content_type ?? News::TYPE_ARTICLE,
                'youtube_url' => $p->youtube_url,
                'youtube_embed_url' => $p->youtube_embed_url,
                'instagram_url' => $p->instagram_url,
                'pdf_url' => $p->resolvedPdfUrl($baseUrl),
                'video_url' => $p->resolvedVideoUrl($baseUrl),
                'has_video' => (bool) $p->has_video,
                'image_url' => $imageUrl,
                'cover_url' => $p->resolvedCoverUrl($baseUrl),
                'published_at' => $p->published_at?->toIso8601String(),
                'author' => $author,
            ];
        };

        $posts = News::query()
            ->with(['author:id,name,photo_url'])
            ->where('section', News::SECTION_HEALTH)
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByRaw('COALESCE(published_at, created_at) DESC')
            ->paginate(15)
            ->withQueryString();

        $posts->getCollection()->transform(fn (News $p) => $mapPost($p));

        return Inertia::render('Mobile/Health', [
            'posts' => $posts,
        ]);
    }

    public function healthShow(Request $request, News $health): Response
    {
        $churchId = $this->currentChurch()?->id;
        if ($churchId === null || $health->church_id !== $churchId) {
            abort(404);
        }
        if ($health->section !== News::SECTION_HEALTH) {
            abort(404);
        }
        if (! $health->is_active) {
            abort(404);
        }
        if ($health->published_at === null || $health->published_at->isFuture()) {
            abort(404);
        }

        $health->loadMissing(['author:id,name,photo_url']);

        $baseUrl = request()->getSchemeAndHttpHost();
        $imageUrl = $health->image_url;
        if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
            $imageUrl = $baseUrl.$imageUrl;
        }

        $author = null;
        if ($health->author !== null) {
            $photoUrl = $health->author->photo_url;
            if ($photoUrl && ! str_starts_with($photoUrl, 'http')) {
                $photoUrl = $baseUrl.$photoUrl;
            }
            $author = [
                'name' => (string) $health->author->name,
                'photo_url' => $photoUrl,
            ];
        }

        return Inertia::render('Mobile/HealthShow', [
            'post' => [
                'id' => $health->id,
                'title' => $health->title,
                'slug' => $health->slug,
                'excerpt' => $health->excerpt,
                'body' => $health->body,
                'content_type' => $health->content_type ?? News::TYPE_ARTICLE,
                'youtube_url' => $health->youtube_url,
                'youtube_embed_url' => $health->youtube_embed_url,
                'instagram_url' => $health->instagram_url,
                'pdf_url' => $health->resolvedPdfUrl($baseUrl),
                'video_url' => $health->resolvedVideoUrl($baseUrl),
                'has_video' => (bool) $health->has_video,
                'image_url' => $imageUrl,
                'cover_url' => $health->resolvedCoverUrl($baseUrl),
                'published_at' => $health->published_at?->toIso8601String(),
                'author' => $author,
            ],
        ]);
    }

    public function revistaAdventista(Request $request): Response
    {
        $section = trim((string) $request->query('section', ''));
        $validSections = array_keys(RevistaAdventistaArticle::sectionLabels());
        if ($section !== '' && ! in_array($section, $validSections, true)) {
            $section = '';
        }

        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) > 0 && mb_strlen($search) < 2) {
            $search = '';
        }

        $mapArticle = fn (RevistaAdventistaArticle $article): array => [
            'id' => $article->id,
            'title' => $article->title,
            'slug' => $article->slug,
            'excerpt' => $article->excerpt,
            'section' => $article->section,
            'section_label' => $article->sectionLabel(),
            'author_name' => $article->author_name,
            'image_url' => $article->image_url,
            'cover_url' => $article->image_url,
            'published_at' => $article->published_at?->toIso8601String(),
        ];

        $articles = RevistaAdventistaArticle::query()
            ->when($section !== '', fn ($q) => $q->where('section', $section))
            ->when($search !== '', fn ($q) => $q->search($search))
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->paginate(15)
            ->withQueryString();

        $articles->getCollection()->transform($mapArticle);

        return Inertia::render('Mobile/RevistaAdventista', [
            'articles' => $articles,
            'sections' => collect(RevistaAdventistaArticle::sectionLabels())
                ->map(fn (string $label, string $key) => ['value' => $key, 'label' => $label])
                ->values()
                ->all(),
            'filters' => [
                'section' => $section !== '' ? $section : null,
                'q' => $search !== '' ? $search : null,
            ],
        ]);
    }

    public function revistaAdventistaShow(RevistaAdventistaArticle $revistaAdventistaArticle): Response
    {
        if (! $revistaAdventistaArticle->is_active) {
            abort(404);
        }
        if ($revistaAdventistaArticle->published_at === null || $revistaAdventistaArticle->published_at->isFuture()) {
            abort(404);
        }

        return Inertia::render('Mobile/RevistaAdventistaShow', [
            'article' => [
                'id' => $revistaAdventistaArticle->id,
                'title' => $revistaAdventistaArticle->title,
                'slug' => $revistaAdventistaArticle->slug,
                'excerpt' => $revistaAdventistaArticle->excerpt,
                'body' => $revistaAdventistaArticle->body,
                'section' => $revistaAdventistaArticle->section,
                'section_label' => $revistaAdventistaArticle->sectionLabel(),
                'author_name' => $revistaAdventistaArticle->author_name,
                'source_url' => $revistaAdventistaArticle->source_url,
                'image_url' => $revistaAdventistaArticle->image_url,
                'cover_url' => $revistaAdventistaArticle->image_url,
                'published_at' => $revistaAdventistaArticle->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function revistaAdventistaAcervo(Request $request): Response
    {
        if (! Schema::hasTable('revista_adventista_editions')) {
            return Inertia::render('Mobile/RevistaAdventistaAcervo', [
                'editions' => [],
                'availableYears' => [],
                'selectedYear' => 2010,
                'decades' => [],
            ]);
        }

        return Inertia::render('Mobile/RevistaAdventistaAcervo', $this->revistaAdventistaAcervoPayload($request));
    }

    public function revistaAdventistaAcervoShow(Request $request, RevistaAdventistaEdition $revistaAdventistaEdition): Response
    {
        if (! $revistaAdventistaEdition->is_active) {
            abort(404);
        }

        $baseUrl = $request->getSchemeAndHttpHost();
        $pdfUrl = $this->mobileRevistaAdventistaPdfUrlFor($revistaAdventistaEdition);

        if ($pdfUrl === null) {
            abort(404);
        }

        return Inertia::render('Mobile/RevistaAdventistaAcervoShow', [
            'edition' => array_merge(
                $this->mapRevistaAdventistaEditionForMobile($revistaAdventistaEdition, $baseUrl),
                [
                    'pdf_url' => $pdfUrl,
                    'source_pdf_url' => $revistaAdventistaEdition->resolvedSourcePdfUrl(),
                ],
            ),
        ]);
    }

    /**
     * @return \Illuminate\Http\Response|\Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function revistaAdventistaAcervoPdfStream(
        RevistaAdventistaEdition $revistaAdventistaEdition,
        RevistaAdventistaEditionPdfService $pdfService,
    ) {
        if (! $revistaAdventistaEdition->is_active || ! $this->revistaAdventistaEditionHasReadablePdf($revistaAdventistaEdition)) {
            abort(404);
        }

        if ($revistaAdventistaEdition->hasLocalPdf()) {
            $response = $pdfService->streamLocalPdf($revistaAdventistaEdition, attachment: false);
            if ($response !== null) {
                return $response;
            }
        }

        $response = $pdfService->streamPdf($revistaAdventistaEdition, attachment: false);
        if ($response === null) {
            abort(404);
        }

        return $response;
    }

    /**
     * @return RedirectResponse|\Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response
     */
    public function revistaAdventistaAcervoPdfDownload(
        RevistaAdventistaEdition $revistaAdventistaEdition,
        RevistaAdventistaEditionPdfService $pdfService,
    ) {
        if (! $revistaAdventistaEdition->is_active || ! $this->revistaAdventistaEditionHasReadablePdf($revistaAdventistaEdition)) {
            abort(404);
        }

        if ($revistaAdventistaEdition->hasLocalPdf()) {
            $response = $pdfService->streamLocalPdf($revistaAdventistaEdition, attachment: true);
            if ($response !== null) {
                return $response;
            }
        }

        $response = $pdfService->streamPdf($revistaAdventistaEdition, attachment: true);
        if ($response === null) {
            abort(404);
        }

        return $response;
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return list<array{value: string, label: string}>
     */
    private function libraryCategoriesForMobile(?Church $church): array
    {
        $categories = [
            ['value' => LibraryBook::CATEGORY_BOOKS, 'label' => 'Livros'],
        ];

        if ($this->revistaAdventistaAcervoAvailable($church)) {
            $categories[] = ['value' => 'revista_adventista_acervo', 'label' => 'Acervo Revista Adventista'];
        }

        $categories[] = ['value' => LibraryBook::CATEGORY_EGW, 'label' => 'Ellen G. White'];
        $categories[] = ['value' => LibraryBook::CATEGORY_MEDITATION, 'label' => 'Meditação'];
        $categories[] = ['value' => 'sunset_meditation', 'label' => 'Meditação Por do Sol'];
        $categories[] = ['value' => LibraryBook::CATEGORY_LESSON, 'label' => 'Lição'];

        return $categories;
    }

    private function revistaAdventistaAcervoAvailable(?Church $church): bool
    {
        if ($church === null || ! Schema::hasTable('revista_adventista_editions')) {
            return false;
        }

        return ChurchAppFeatures::isEnabled($church, 'revista_adventista_acervo');
    }

    /**
     * @return array{editions: list<array<string, mixed>>, availableYears: list<int>, selectedYear: int, decades: list<array{label: string, years: list<int>}>}
     */
    private function revistaAdventistaAcervoPayload(Request $request): array
    {
        $baseUrl = $request->getSchemeAndHttpHost();
        $availableYears = RevistaAdventistaEdition::query()
            ->where('is_active', true)
            ->whereNotNull('source_cover_url')
            ->where('source_cover_url', '!=', '')
            ->whereNotNull('source_pdf_url')
            ->where('source_pdf_url', '!=', '')
            ->select('year')
            ->distinct()
            ->orderByDesc('year')
            ->pluck('year')
            ->map(fn ($year) => (int) $year)
            ->values()
            ->all();

        $preferredDefaultYear = 2010;
        $defaultYear = in_array($preferredDefaultYear, $availableYears, true)
            ? $preferredDefaultYear
            : ($availableYears[0] ?? $preferredDefaultYear);
        $selectedYear = (int) $request->query('ano', $defaultYear);
        if ($availableYears !== [] && ! in_array($selectedYear, $availableYears, true)) {
            $selectedYear = $defaultYear;
        }

        $editions = RevistaAdventistaEdition::query()
            ->where('is_active', true)
            ->where('year', $selectedYear)
            ->whereNotNull('source_cover_url')
            ->where('source_cover_url', '!=', '')
            ->whereNotNull('source_pdf_url')
            ->where('source_pdf_url', '!=', '')
            ->orderBy('month')
            ->get()
            ->map(fn (RevistaAdventistaEdition $edition) => $this->mapRevistaAdventistaEditionForMobile($edition, $baseUrl))
            ->filter(fn (array $edition) => filled($edition['cover_url'] ?? null) && ($edition['has_pdf'] ?? false))
            ->values()
            ->all();

        return [
            'editions' => $editions,
            'availableYears' => $availableYears,
            'selectedYear' => $selectedYear,
            'decades' => $this->revistaAdventistaDecades($availableYears),
        ];
    }

    private function mapRevistaAdventistaEditionForMobile(RevistaAdventistaEdition $edition, string $baseUrl): array
    {
        return [
            'id' => $edition->id,
            'title' => $edition->title,
            'year' => $edition->year,
            'month' => $edition->month,
            'month_code' => $edition->month_code,
            'month_label' => $edition->monthLabel(),
            'cpb_edition_id' => $edition->cpb_edition_id,
            'cover_url' => $edition->resolvedCoverUrl($baseUrl),
            'has_pdf' => $this->revistaAdventistaEditionHasReadablePdf($edition),
            'pdf_cached' => $edition->hasLocalPdf(),
            'cover_cached' => $edition->hasLocalCover(),
        ];
    }

    private function mobileRevistaAdventistaPdfUrlFor(RevistaAdventistaEdition $edition): ?string
    {
        if (! $this->revistaAdventistaEditionHasReadablePdf($edition)) {
            return null;
        }

        if ($edition->hasLocalPdf()) {
            return $edition->resolvedPdfUrl('');
        }

        return route('mobile.acervo-revista-adventista.pdf-stream', ['revistaAdventistaEdition' => $edition->id], absolute: false);
    }

    private function revistaAdventistaEditionHasReadablePdf(RevistaAdventistaEdition $edition): bool
    {
        if ($edition->hasLocalPdf()) {
            return true;
        }

        return $edition->resolvedSourcePdfUrl() !== null;
    }

    /**
     * @param  list<int>  $years
     * @return list<array{label: string, years: list<int>}>
     */
    private function revistaAdventistaDecades(array $years): array
    {
        if ($years === []) {
            return [];
        }

        $grouped = [];
        foreach ($years as $year) {
            $decade = (int) (floor($year / 10) * 10);
            $grouped[$decade][] = $year;
        }

        krsort($grouped);

        return collect($grouped)
            ->map(fn (array $decadeYears, int $decade) => [
                'label' => $decade === (int) floor(((int) date('Y')) / 10) * 10
                    ? 'Recentes'
                    : $decade.'–'.($decade + 9),
                'years' => array_values($decadeYears),
            ])
            ->values()
            ->all();
    }

    public function events(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $events = $this->whereEventNotPast(
            Event::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
                ->visibleToPublic()
        )
            ->orderBy('starts_at')
            ->get()
            ->map(function (Event $e) {
                $imageUrl = $e->image_url;
                if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                    $imageUrl = request()->getSchemeAndHttpHost().$imageUrl;
                }

                return [
                    'id' => $e->id,
                    'title' => $e->title,
                    'description' => $e->description,
                    'starts_at' => $e->starts_at->toIso8601String(),
                    'ends_at' => $e->ends_at?->toIso8601String(),
                    'all_day' => $e->all_day,
                    'location' => $e->location,
                    'price' => $e->price,
                    'purchase_url' => $e->purchase_url,
                    'video_type' => $e->video_type,
                    'video_url' => $e->video_url,
                    'youtube_embed_url' => $e->youtube_embed_url,
                    'image_url' => $imageUrl,
                    'color' => $e->color,
                ];
            });

        return Inertia::render('Mobile/Events', [
            'events' => $events,
        ]);
    }

    private function getSaturdays(int $year, int $month): array
    {
        $saturdays = [];
        $date = Carbon::create($year, $month, 1);
        while ($date->month === $month) {
            if ($date->dayOfWeek === Carbon::SATURDAY) {
                $saturdays[] = $date->copy();
            }
            $date->addDay();
        }

        return $saturdays;
    }

    private function userPhotoPublicUrl(?User $user): ?string
    {
        return ScheduleBoardViewData::userPhotoPublicUrl($user);
    }

    public function schedule(Request $request): Response|RedirectResponse
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        if (! $request->user()) {
            return Inertia::render('Mobile/VolunteerSchedule', [
                'canViewSchedule' => false,
                'month' => $month,
                'year' => $year,
                'memberName' => null,
                'memberPhotoUrl' => null,
                'needsMember' => false,
                'volunteerOverview' => null,
            ]);
        }

        $user = $request->user();

        $workingChurchId = Church::resolveWorkingId($request);
        if (! $user->church_id || (int) $user->church_id !== (int) $workingChurchId) {
            return Inertia::render('Mobile/VolunteerScheduleHome', [
                'canViewSchedule' => true,
                'memberName' => $user->name,
                'memberPhotoUrl' => null,
                'needsMember' => true,
                'months' => [],
            ]);
        }

        $month1 = $month;
        $year1 = $year;
        $month2 = $month1 + 1;
        $year2 = $year1;
        if ($month2 > 12) {
            $month2 = 1;
            $year2 += 1;
        }

        $overview1 = VolunteerScheduleOverview::forMember(
            (int) $user->id,
            $year1,
            $month1,
            fn ($u) => $this->userPhotoPublicUrl($u)
        );
        $overview2 = VolunteerScheduleOverview::forMember(
            (int) $user->id,
            $year2,
            $month2,
            fn ($u) => $this->userPhotoPublicUrl($u)
        );

        return Inertia::render('Mobile/VolunteerScheduleHome', [
            'canViewSchedule' => true,
            'memberName' => $user->name,
            'memberPhotoUrl' => $this->userPhotoPublicUrl($user),
            'needsMember' => false,
            'months' => [
                ['month' => $month1, 'year' => $year1, 'overview' => $overview1],
                ['month' => $month2, 'year' => $year2, 'overview' => $overview2],
            ],
        ]);
    }

    public function scheduleFull(Request $request): Response|RedirectResponse
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        if (! $request->user()) {
            return redirect()->route('login');
        }

        $user = $request->user();

        // "Agenda Completa" no mobile abre a visão completa (Escalas/Index).
        // Para líderes/admins é modo edição; para usuário comum é somente leitura (canEdit=false).
        $query = ['month' => $month, 'year' => $year];
        if ($request->filled('ministry_id')) {
            $query['ministry_id'] = (int) $request->input('ministry_id');
        }

        return redirect()->route('escalas.index', $query);
    }

    public function scheduleCheckin(Request $request): Response
    {
        $valid = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'inbox' => 'nullable|integer|exists:user_inbox_notifications,id',
        ]);

        $date = Carbon::parse($valid['date'])->startOfDay();
        $user = $request->user();

        if ($user && ! empty($valid['inbox'])) {
            $inbox = UserInboxNotification::query()
                ->where('id', $valid['inbox'])
                ->where('user_id', $user->id)
                ->first();
            if ($inbox) {
                $inbox->update(['read_at' => now()]);
            }
        }

        if (! $user || (! $user->church_id && ! $user->volunteerProfile)) {
            return Inertia::render('Mobile/ScheduleCheckin', [
                'date' => $valid['date'],
                'dateLabel' => $date->translatedFormat('d/m/Y'),
                'assignments' => [],
                'checkinEnabled' => ScheduleCheckinDate::where('schedule_date', $date)->exists(),
                'ministryName' => null,
                'needsMember' => true,
            ]);
        }

        $photo = fn ($u) => $this->userPhotoPublicUrl($u);
        $byAssignmentId = [];
        if ($user->church_id) {
            foreach (ScheduleAssignmentPresenter::assignmentsForMemberOnDate((int) $user->id, $valid['date'], $photo) as $row) {
                $byAssignmentId[$row['id']] = $row;
            }
        }
        if ($user->volunteerProfile) {
            foreach (ScheduleAssignmentPresenter::assignmentsForVolunteerOnDate((int) $user->volunteerProfile->id, $valid['date'], $photo) as $row) {
                $byAssignmentId[$row['id']] = $row;
            }
        }
        $assignments = array_values($byAssignmentId);

        $ministryName = $assignments[0]['ministryName'] ?? null;

        return Inertia::render('Mobile/ScheduleCheckin', [
            'date' => $valid['date'],
            'dateLabel' => $date->translatedFormat('d/m/Y'),
            'assignments' => $assignments,
            'checkinEnabled' => ScheduleCheckinDate::where('schedule_date', $date)->exists(),
            'ministryName' => $ministryName,
            'needsMember' => false,
        ]);
    }

    public function markInboxNotificationRead(Request $request)
    {
        $valid = $request->validate([
            'id' => 'required|exists:user_inbox_notifications,id',
        ]);

        $n = UserInboxNotification::query()
            ->where('id', $valid['id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $n->update(['read_at' => now()]);

        return back();
    }

    public function removeNotification(Request $request)
    {
        $user = $request->user();
        abort_unless($user, 401);

        $valid = $request->validate([
            'kind' => ['required', 'string', 'in:inbox,app'],
            'id' => ['required', 'integer', 'min:1'],
        ]);

        if ($valid['kind'] === 'inbox') {
            UserInboxNotification::query()
                ->where('id', $valid['id'])
                ->where('user_id', $user->id)
                ->delete();
        } else {
            $exists = AppNotification::query()->whereKey($valid['id'])->exists();
            abort_unless($exists, 404);

            UserDismissedAppNotification::query()->firstOrCreate([
                'user_id' => $user->id,
                'app_notification_id' => $valid['id'],
            ]);
        }

        return back();
    }

    public function more(): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('mobile.home');
    }

    public function publicationsFeed(Request $request): Response|\Illuminate\Http\JsonResponse
    {
        PublicationsFeedAccess::assertCanAccess($request->user());

        $churchId = $this->currentChurch()?->id;
        $payload = PublicationFeed::paginatedForRequest($request, $churchId);

        if ($request->expectsJson()) {
            return response()->json($payload['items']);
        }

        return Inertia::render('Mobile/PublicationsFeed', [
            'items' => $payload['items'],
            'typeOptions' => $payload['typeOptions'],
            'filters' => $payload['filters'],
        ]);
    }

    public function sobreOApp(Request $request): Response
    {
        $from = $request->string('from')->toString();
        $backRoute = $from === 'settings' ? 'mobile.settings' : 'mobile.home';
        $backLabel = $from === 'settings' ? 'Configurações' : 'Início';

        return Inertia::render('Mobile/SobreOApp', [
            'backRoute' => $backRoute,
            'backLabel' => $backLabel,
        ]);
    }

    public function beliefs(): Response
    {
        return Inertia::render('Mobile/Beliefs');
    }

    public function quemSomos(): Response
    {
        return Inertia::render('Mobile/QuemSomos');
    }

    public function fotos(DriveFolderCoverService $cover): Response
    {
        $churchId = $this->currentChurch()?->id;

        $albums = PhotoAlbum::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->visibleInApp()
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (PhotoAlbum $a) use ($cover) {
                $autoCoverUrl = null;
                if (! $a->cover_image_url && $a->drive_folder_id) {
                    $autoCoverUrl = $cover->coverUrlForPublicFolder($a->drive_folder_id);
                }

                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'photographer_name' => $a->photographer_name,
                    'published_at' => $a->published_at?->toIso8601String(),
                    'cover_image_url' => $a->cover_image_url,
                    'auto_cover_url' => $autoCoverUrl,
                    'drive_view_url' => $a->drive_folder_view_url,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Mobile/PhotoAlbums', [
            'albums' => $albums,
        ]);
    }

    public function fotosShow(PhotoAlbum $album, DriveFolderImagesService $driveImages): Response
    {
        $churchId = $this->currentChurch()?->id;
        if ($churchId === null || (int) $album->church_id !== (int) $churchId) {
            abort(404);
        }
        if ($album->published_at !== null && $album->published_at->isFuture()) {
            abort(404);
        }

        $embedUrl = $album->drive_folder_embed_url;
        $folderUrl = $album->drive_folder_view_url;
        abort_unless($embedUrl && $folderUrl, 404);

        $images = [];
        if ($album->drive_folder_id) {
            $images = $driveImages->listPublicFolderImages($album->drive_folder_id);
        }

        return Inertia::render('Mobile/Photos', [
            'title' => $album->title,
            'publishedAt' => $album->published_at?->toIso8601String(),
            'photographerName' => $album->photographer_name,
            'embedUrl' => $embedUrl,
            'folderUrl' => $folderUrl,
            'images' => $images,
        ]);
    }

    public function biblioteca(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $church = $this->currentChurch();
        $baseUrl = $request->getSchemeAndHttpHost();
        $categories = $this->libraryCategoriesForMobile($church);
        $acervoEnabled = $this->revistaAdventistaAcervoAvailable($church);

        if (! Schema::hasTable('library_books')) {
            return Inertia::render('Mobile/Library', [
                'books' => [],
                'categories' => $categories,
                'revistaAdventistaAcervo' => $acervoEnabled ? $this->revistaAdventistaAcervoPayload($request) : null,
                'librarySetupMessage' => 'A biblioteca ainda não está disponível. Peça ao responsável técnico para concluir a atualização da base de dados.',
            ]);
        }

        $books = LibraryBook::query()
            ->forMobileLibrary($churchId)
            ->visibleInApp()
            ->orderByDesc('order')
            ->orderByDesc('published_at')
            ->orderBy('title')
            ->get()
            ->map(fn (LibraryBook $b) => $this->mapLibraryBookForMobile($b, $baseUrl))
            ->values()
            ->all();

        return Inertia::render('Mobile/Library', [
            'books' => $books,
            'categories' => $categories,
            'revistaAdventistaAcervo' => $acervoEnabled ? $this->revistaAdventistaAcervoPayload($request) : null,
            'meditationUrl' => $church !== null ? $church->resolvedLibraryMeditationUrl() : null,
            'lessonUrl' => $church !== null ? $church->resolvedLibraryLessonUrl() : null,
            'sunsetMeditationConfigured' => $church !== null && $church->hasLibrarySunsetMeditation(),
            'librarySetupMessage' => null,
        ]);
    }

    public function bibliotecaShow(Request $request, LibraryBook $libraryBook): Response
    {
        if (! $this->canAccessLibraryBook($libraryBook)) {
            abort(404);
        }

        $baseUrl = $request->getSchemeAndHttpHost();

        return Inertia::render('Mobile/LibraryShow', [
            'book' => $this->mapLibraryBookForMobile($libraryBook, $baseUrl, includePublishedAt: true),
        ]);
    }

    /**
     * PDF inline para leitura no app (proxy/cache para catálogo EGW).
     *
     * @return \Illuminate\Http\Response|\Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function bibliotecaPdfStream(LibraryBook $libraryBook, LibraryEgwPdfService $pdfService)
    {
        if (! $this->canAccessLibraryBook($libraryBook)) {
            abort(404);
        }

        if (! $this->libraryBookHasReadablePdf($libraryBook)) {
            abort(404);
        }

        if ($libraryBook->hasLocalPdf()) {
            $response = $pdfService->streamLocalPdf($libraryBook, attachment: false);
            if ($response !== null) {
                return $response;
            }
        }

        $response = $pdfService->streamPdf($libraryBook, attachment: false);
        if ($response === null) {
            abort(404);
        }

        return $response;
    }

    /**
     * Descarrega o PDF com Content-Disposition: attachment (evita abrir o visualizador como em «Ler»).
     *
     * @return RedirectResponse|\Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\Response
     */
    public function bibliotecaPdfDownload(LibraryBook $libraryBook, LibraryEgwPdfService $pdfService)
    {
        if (! $this->canAccessLibraryBook($libraryBook)) {
            abort(404);
        }

        if (! $this->libraryBookHasReadablePdf($libraryBook)) {
            abort(404);
        }

        if ($libraryBook->category === LibraryBook::CATEGORY_EGW || $libraryBook->resolvedSourcePdfUrl() !== null) {
            if ($libraryBook->hasLocalPdf()) {
                $response = $pdfService->streamLocalPdf($libraryBook, attachment: true);
                if ($response !== null) {
                    return $response;
                }
            }

            $response = $pdfService->streamPdf($libraryBook, attachment: true);
            if ($response !== null) {
                return $response;
            }

            abort(404);
        }

        $rawPath = $libraryBook->pdf_path;
        if ($rawPath === null || trim((string) $rawPath) === '') {
            abort(404);
        }

        if (str_starts_with($rawPath, 'http://') || str_starts_with($rawPath, 'https://')) {
            return redirect()->away($rawPath);
        }

        $path = trim(str_replace('\\', '/', (string) $rawPath), '/');
        if (! $this->isMobileLibraryPdfStoragePath($path)) {
            abort(404);
        }

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        $slug = Str::slug($libraryBook->title);
        $downloadName = ($slug !== '' ? $slug : 'publicacao-'.$libraryBook->id).'.pdf';

        return Storage::disk('public')->download($path, $downloadName, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function canAccessLibraryBook(LibraryBook $libraryBook): bool
    {
        if ($libraryBook->published_at !== null && $libraryBook->published_at->isFuture()) {
            return false;
        }

        if ($libraryBook->isGlobalEgw()) {
            return $this->currentChurch()?->id !== null;
        }

        $churchId = $this->currentChurch()?->id;

        return $churchId !== null && (int) $libraryBook->church_id === (int) $churchId;
    }

    private function libraryBookHasReadablePdf(LibraryBook $libraryBook): bool
    {
        if ($libraryBook->hasLocalPdf()) {
            return true;
        }

        if ($libraryBook->resolvedSourcePdfUrl() !== null) {
            return true;
        }

        $rawPath = trim((string) ($libraryBook->pdf_path ?? ''));

        return $rawPath !== '';
    }

    /**
     * @return array<string, mixed>
     */
    private function mapLibraryBookForMobile(LibraryBook $b, string $baseUrl, bool $includePublishedAt = false): array
    {
        $payload = [
            'id' => $b->id,
            'title' => $b->title,
            'subtitle' => $b->subtitle,
            'description' => $b->description,
            'category' => $b->category,
            'cover_url' => $b->resolvedCoverUrl($baseUrl),
            'pdf_url' => $this->mobilePdfUrlFor($b, $baseUrl),
            'external_url' => $this->normalizedLibraryExternalUrl($b->external_url),
        ];

        if ($includePublishedAt) {
            $payload['published_at'] = $b->published_at?->toIso8601String();
        }

        return $payload;
    }

    private function mobilePdfUrlFor(LibraryBook $book, string $baseUrl): ?string
    {
        if ($book->category === LibraryBook::CATEGORY_EGW && $this->libraryBookHasReadablePdf($book)) {
            return route('mobile.biblioteca.pdf-stream', ['libraryBook' => $book->id], absolute: false);
        }

        if ($book->hasLocalPdf()) {
            return $book->resolvedPdfUrl($baseUrl);
        }

        return $book->resolvedPdfUrl($baseUrl);
    }

    /**
     * Caminhos de PDF em disco público (alinhado ao prefixo permitido em PublicDiskFileController).
     * Aceita library/pdfs/… e outros .pdf sob library/ (exceto capas).
     */
    private function isMobileLibraryPdfStoragePath(string $path): bool
    {
        if ($path === '' || str_contains($path, '..')) {
            return false;
        }
        if (! str_starts_with($path, 'library/')) {
            return false;
        }
        if (str_starts_with($path, 'library/covers/')) {
            return false;
        }

        return str_ends_with(strtolower($path), '.pdf');
    }

    public function location(): Response
    {
        return Inertia::render('Mobile/Location');
    }

    public function services(): Response
    {
        $church = $this->currentChurch();
        $services = [];
        if ($church) {
            $services = $church->services()->get()->map(function ($s) {
                $start = \Carbon\Carbon::parse($s->start_time)->format('H:i');
                $end = $s->end_time ? \Carbon\Carbon::parse($s->end_time)->format('H:i') : null;

                return [
                    'id' => $s->id,
                    'day_of_week' => $s->day_of_week,
                    'day_name' => ChurchService::dayName($s->day_of_week),
                    'name' => $s->name,
                    'start_time' => $start,
                    'end_time' => $end,
                ];
            })->toArray();
        }

        $weeklyProgram = app(\App\Services\WeeklyProgramService::class)->agendaRows($church);

        return Inertia::render('Mobile/Services', [
            'churchName' => $church?->name,
            'services' => $services,
            'weeklyProgram' => $weeklyProgram,
        ]);
    }

    public function leaderContact(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        if ($user->hasRole('lider_ministerio') || (bool) ($user->is_ministry_leader ?? false)) {
            return redirect()->route('mobile.profile')->with(
                'error',
                'Esta área é para membros contactarem líderes. Como líder de ministério, use as outras opções do perfil.'
            );
        }
        $churchId = Church::resolveWorkingId($request);

        $contactUrl = route('mobile.contact');
        $myLeaderChats = ChurchSolicitation::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where('user_id', $user->id)
            ->where('type', 'leader_chat')
            ->whereNull('member_hidden_at')
            ->with(['assignedPastor:id,name', 'assignedVolunteer.user:id,name'])
            ->orderByDesc('updated_at')
            ->limit(40)
            ->get()
            ->map(function (ChurchSolicitation $s) use ($contactUrl, $churchId) {
                $payload = MobileChurchSolicitationController::memberConversationPayload(
                    $s,
                    route('mobile.solicitations.messages.store', $s),
                    $contactUrl,
                    $contactUrl,
                    route('mobile.solicitations.leader-chat.finalize', $s),
                    false,
                );

                return array_merge($payload, [
                    'memberUpdateUrl' => route('mobile.solicitations.update', $s),
                    'memberCanEditDetails' => $s->status === 'pending',
                    'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                ]);
            })
            ->values()
            ->all();

        return Inertia::render('Mobile/LiderContact', [
            'leaderOptions' => SolicitationAssignees::leaderContactVolunteerOptions($churchId, $user),
            'contactMinistry' => SolicitationAssignees::leaderContactMinistryForChurch($churchId),
            'storeUrl' => route('mobile.contact.store'),
            'myLeaderChats' => $myLeaderChats,
        ]);
    }

    public function leaderContactStore(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        if ($user->hasRole('lider_ministerio') || (bool) ($user->is_ministry_leader ?? false)) {
            return redirect()->route('mobile.profile')->with(
                'error',
                'Esta área é para membros contactarem líderes.'
            );
        }
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $valid = $request->validate([
            'assigned_volunteer_id' => ['required', 'integer'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        if (! SolicitationAssignees::isValidLeaderContactVolunteer((int) $valid['assigned_volunteer_id'], (int) $churchId, $user)) {
            throw ValidationException::withMessages([
                'assigned_volunteer_id' => ['Escolha um líder da equipe de Voluntariado.'],
            ]);
        }

        $volunteer = Volunteer::query()
            ->whereKey((int) $valid['assigned_volunteer_id'])
            ->where('active', true)
            ->whereNotNull('user_id')
            ->firstOrFail();

        $solicitation = ChurchSolicitation::create([
            'church_id' => (int) $churchId,
            'user_id' => $user->id,
            'type' => 'leader_chat',
            'status' => 'pending',
            'subject' => $valid['subject'],
            'message' => $valid['message'],
            'preferred_date' => null,
            'assigned_pastor_id' => null,
            'assigned_volunteer_id' => (int) $volunteer->id,
            'meta' => null,
        ]);

        app(SolicitationChatNotifier::class)->notifyAssignedLeaderOfNewRequest($solicitation);

        return redirect()->route('mobile.contact', [
            'solicitacao' => $solicitation->id,
            'painel' => 'chat',
        ])->with('success', 'Conversa iniciada.');
    }

    public function offerings(): Response
    {
        $church = $this->currentChurch();
        $donationUrl = $church?->donation_url ?: 'https://giving.7me.app/guest-donation/church/96ccdd6e-f537-49be-88dd-ffc112442cd9';

        $donation = [
            'churchName' => $church?->name,
            'pix_key' => $church?->pix_key,
            'donation_url' => $donationUrl,
        ];

        $localOffer = [
            'pixKey' => filled($church?->pix_key) ? trim((string) $church->pix_key) : 'novasemente.ap@adventistas.org',
            'merchantName' => $church?->name ?? 'Nova Semente',
            'merchantCity' => filled($church?->city) ? (string) $church->city : 'Brasília',
        ];

        return Inertia::render('Mobile/Offerings', [
            'donation' => $donation,
            'localOffer' => $localOffer,
        ]);
    }

    public function classeComecos(): Response
    {
        return Inertia::render('Mobile/ClasseComecos', [
            'presencialUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLScBw6m09liDBLBGBJ52OwGGl0wegNxK6KpChq31w81cjuESZA/viewform',
            'onlineUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLSeGNVPeTe9PYQ1w7gwN2ZPA4QN8J7LwqIJtV1iObtQqHvCdUw/viewform',
        ]);
    }

    public function acervo(): Response
    {
        $items = AcervoItem::query()
            ->orderByDesc('order')
            ->orderBy('title')
            ->get()
            ->map(fn (AcervoItem $item) => [
                'id' => $item->id,
                'url' => $item->url,
                'title' => $item->title,
                'thumbnail' => $item->thumbnail_url,
                'videoCount' => $item->video_count,
            ]);

        return Inertia::render('Mobile/AcervoIndex', [
            'items' => $items,
            // Fallback quando não há itens cadastrados.
            'playlistsUrl' => 'https://www.youtube.com/@advnovasemente/playlists',
            // No app (Mais) o acervo é apenas leitura; gestão fica no painel (acervo.index).
            'canManage' => false,
        ]);
    }

    public function acervoShow(Request $request, AcervoItem $acervoItem): Response
    {
        $url = trim((string) $acervoItem->url);
        $title = trim((string) $acervoItem->title);

        $listId = Musica::youtubePlaylistIdFromUrl($url);
        $videoId = Musica::youtubeVideoId($url);
        $episodes = $listId !== null ? $this->acervoPlaylistEpisodes($listId) : [];

        $embedUrl = null;
        if ($listId !== null && $episodes !== []) {
            $firstVideoId = $episodes[0]['video_id'] ?? null;
            $embedUrl = is_string($firstVideoId) && $firstVideoId !== ''
                ? "https://www.youtube.com/embed/{$firstVideoId}?list={$listId}"
                : "https://www.youtube.com/embed/videoseries?list={$listId}";
        } elseif ($listId !== null) {
            $embedUrl = "https://www.youtube.com/embed/videoseries?list={$listId}";
        } elseif ($videoId) {
            $embedUrl = "https://www.youtube.com/embed/{$videoId}";
        }

        $videoCount = count($episodes) > 0
            ? count($episodes)
            : $acervoItem->video_count;

        return Inertia::render('Mobile/AcervoShow', [
            'item' => [
                'id' => $acervoItem->id,
                'title' => $title !== '' ? $title : 'Séries',
                'url' => $url,
                'embed_url' => $embedUrl,
                'playlist_id' => $listId,
                'videoCount' => $videoCount,
                'episodes' => $episodes,
            ],
        ]);
    }

    /**
     * @return list<array{video_id: string, title: string, thumbnail: string}>
     */
    private function acervoPlaylistEpisodes(string $listId): array
    {
        $cacheKey = 'acervo_playlist_episodes_'.md5($listId);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $fetched = YoutubePlaylistImportService::fetchPlaylistVideos($listId);
        if (! ($fetched['ok'] ?? false) || ! is_array($fetched['items'] ?? null)) {
            return [];
        }

        $episodes = [];
        foreach ($fetched['items'] as $row) {
            $videoId = is_string($row['video_id'] ?? null) ? $row['video_id'] : '';
            $episodeTitle = is_string($row['title'] ?? null) ? trim($row['title']) : '';
            if ($videoId === '' || strlen($videoId) !== 11) {
                continue;
            }
            $lower = mb_strtolower($episodeTitle);
            if ($lower === 'deleted video' || $lower === 'private video') {
                continue;
            }
            $episodes[] = [
                'video_id' => $videoId,
                'title' => $episodeTitle !== '' ? $episodeTitle : 'Sem título',
                'thumbnail' => "https://i.ytimg.com/vi/{$videoId}/mqdefault.jpg",
            ];
        }

        if ($episodes !== []) {
            Cache::put($cacheKey, $episodes, 3600);
        }

        return $episodes;
    }

    public function notifications(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $notifications = NotificationFeed::mergedForUser($request, $churchId, 50);

        return Inertia::render('Mobile/Notifications', [
            'notifications' => $notifications,
        ]);
    }

    public function pastors(): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;

        $rows = Pastor::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Pastor $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'bio' => $p->bio,
                'photoUrl' => $p->photo_path,
            ])
            ->values()
            ->all();

        return Inertia::render('Mobile/Pastors', [
            'pastors' => $rows,
            'churchName' => $church?->name,
        ]);
    }

    public function pastorMyAvailability(Request $request): Response|\Illuminate\Http\RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $pastor = Pastor::query()
            ->where('church_id', $churchId)
            ->where('user_id', $user->id)
            ->first();

        if ($pastor === null) {
            return Inertia::render('Mobile/PastorMyAvailability', [
                'linked' => false,
            ]);
        }

        return redirect()->route('pastoral-agenda.index', ['mine' => true]);
    }

    public function settings(Request $request): Response
    {
        $church = $this->currentChurch();
        $user = $request->user();

        return Inertia::render('Mobile/Settings', [
            'church' => $church ? [
                'name' => $church->name,
                'logo_url' => $church->logo_url,
                'city' => $church->city,
                'state' => $church->state,
                'country' => $church->country,
                'description' => $church->description,
            ] : null,
            'user' => $user ? [
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
        ]);
    }

    public function profile(Request $request): Response
    {
        $church = $this->currentChurch();
        $user = $request->user();
        abort_unless($user, 401);

        /** Igual ao `currentChurch` do HandleInertiaRequests (feed do sino); evita divergir de `resolveWorkingId`. */
        $churchId = $church !== null ? (int) $church->id : Church::resolveWorkingId($request);

        /** Igual ao perfil móvel: contagem só para equipe do painel, não `lider_ministerio` só com permissões soltas. */
        $atendimentoStaff = $user->hasAnyRole(['super_admin', 'admin', 'pastor', 'secretaria']);
        $atendimentoOpen = null;
        if (
            $atendimentoStaff
            && (
                $user->hasAnyRole(['super_admin', 'admin'])
                || $user->can('solicitations.view')
                || $user->can('solicitations.manage')
            )
        ) {
            if ($churchId !== null) {
                $atendimentoOpen = (int) ChurchSolicitation::query()
                    ->where('church_id', $churchId)
                    ->whereNotIn('type', MobileChurchSolicitationController::TYPES_OUTSIDE_PASTORAL_INDEX)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->count();
            }
        }

        $pastoralAgendaItems = null;
        if ($churchId !== null) {
            $linkedPastor = Pastor::query()
                ->where('church_id', $churchId)
                ->where('user_id', $user->id)
                ->first();
            if ($linkedPastor !== null) {
                $appointments = PastoralAppointment::query()
                    ->where('church_id', $churchId)
                    ->where('preferred_pastor_id', $linkedPastor->id)
                    ->where('status', '!=', 'cancelled')
                    ->count();
                $visits = ChurchSolicitation::query()
                    ->where('church_id', $churchId)
                    ->where('type', 'pastor_visit')
                    ->where('assigned_pastor_id', $linkedPastor->id)
                    ->whereIn('status', ['pending', 'in_progress'])
                    ->count();
                $pastoralAgendaItems = (int) $appointments + (int) $visits;
            }
        }

        $notificationsTotal = NotificationFeed::mergedTotalCountForUser($request, $churchId);

        $volunteerSignupCompletion = VolunteerSignupCompletion::profileAlertForUser($user);

        return Inertia::render('Mobile/Profile', [
            'church' => $church ? [
                'name' => $church->name,
            ] : null,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'photo_url' => $user->photo_url,
            ],
            'profileCounts' => [
                'atendimento_open' => $atendimentoOpen,
                'pastoral_agenda' => $pastoralAgendaItems,
                'notifications' => $notificationsTotal,
            ],
            'volunteerSignupCompletion' => $volunteerSignupCompletion,
        ]);
    }

    public function profileEdit(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = (int) ($user->church_id ?? 0);
        if ($churchId === 0) {
            $resolved = Church::resolveWorkingId($request);
            if ($resolved !== null) {
                $churchId = (int) $resolved;
            }
        }

        $user->loadMissing('volunteerProfile');
        $volunteerMinistries = $churchId > 0 && $user->volunteerProfile
            ? $user->volunteerProfile->ministries()
                ->where('church_id', $churchId)
                ->orderBy('name')
                ->get(['ministries.id', 'ministries.name'])
                ->map(fn (Ministry $m) => ['id' => (int) $m->id, 'name' => (string) $m->name])
                ->values()
                ->all()
            : [];

        $volunteerSignupCompletion = VolunteerSignupCompletion::profileAlertForUser($user);
        $volunteerSignupProgress = \Illuminate\Support\Facades\Route::has('volunteers.self-signup.edit')
            ? VolunteerSignupCompletion::forUser($user)
            : null;

        return Inertia::render('Mobile/ProfileEdit', [
            'mustVerifyEmail' => $user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail,
            'status' => session('status'),
            'volunteerMinistries' => $volunteerMinistries,
            'profileRedirectTo' => 'mobile.profile.edit',
            'volunteerSignupCompletion' => $volunteerSignupCompletion,
            'volunteerSignupProgress' => $volunteerSignupProgress,
        ]);
    }
}
