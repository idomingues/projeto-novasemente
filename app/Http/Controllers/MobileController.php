<?php

namespace App\Http\Controllers;

use App\Models\AcervoItem;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\ChurchSolicitation;
use App\Models\Culto;
use App\Models\Event;
use App\Models\Ministry;
use App\Models\Musica;
use App\Models\News;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\PhotoAlbum;
use App\Models\ScheduleCheckinDate;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Services\DriveFolderCoverService;
use App\Services\DriveFolderImagesService;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\SolicitationChatNotifier;
use App\Services\VolunteerScheduleOverview;
use App\Support\NotificationFeed;
use App\Support\ScheduleBoardViewData;
use App\Support\SolicitationAssignees;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileController extends Controller
{
    private function currentChurch(): ?Church
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return $church;
            }
        }

        return Church::where('active', true)->orderBy('name')->first();
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
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
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
     * Splash screen (vídeo) ao abrir /mobile.
     */
    public function splash(Request $request): Response
    {
        return Inertia::render('Mobile/Splash', [
            'videoSrc' => route('media.ns-splash'),
            'nextUrl' => route('mobile.home', [], false),
        ]);
    }

    /**
     * Início da app (substitui News como ecrã principal): atalhos + últimas notícias.
     */
    public function home(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;
        $baseUrl = $request->getSchemeAndHttpHost();

        $latestNews = News::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
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
                    default => 'NOTÍCIA',
                };

                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'slug' => $n->slug,
                    'excerpt' => $n->excerpt,
                    'content_type' => $type,
                    'type_label' => $typeLabel,
                    'image_url' => $imageUrl,
                    'cover_url' => $n->resolvedCoverUrl($baseUrl),
                    'published_at' => $n->published_at?->toIso8601String(),
                ];
            });

        $upcomingEvents = $this->whereEventNotPast(
            Event::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
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
                    'image_url' => $imageUrl,
                    'color' => $e->color,
                ];
            });

        return Inertia::render('Mobile/Home', [
            'latestNews' => $latestNews,
            'upcomingEvents' => $upcomingEvents,
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

    public function news(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $query = News::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at');

        $posts = $query->paginate(10)->withQueryString();

        $baseUrl = request()->getSchemeAndHttpHost();
        $posts->getCollection()->transform(function (News $p) use ($baseUrl) {
            $imageUrl = $p->image_url;
            if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                $imageUrl = $baseUrl.$imageUrl;
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
                'pdf_url' => $p->resolvedPdfUrl($baseUrl),
                'image_url' => $imageUrl,
                'cover_url' => $p->resolvedCoverUrl($baseUrl),
                'published_at' => $p->published_at?->toIso8601String(),
            ];
        });

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
        if ($news->published_at === null || $news->published_at->isFuture()) {
            abort(404);
        }

        $baseUrl = request()->getSchemeAndHttpHost();
        $imageUrl = $news->image_url;
        if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
            $imageUrl = $baseUrl.$imageUrl;
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
                'pdf_url' => $news->resolvedPdfUrl($baseUrl),
                'image_url' => $imageUrl,
                'cover_url' => $news->resolvedCoverUrl($baseUrl),
                'published_at' => $news->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function events(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $events = $this->whereEventNotPast(
            Event::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
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

    public function more(): Response
    {
        $data = app(MoreController::class)->getLatestItems();

        return Inertia::render('Mobile/More', $data);
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
                    'published_at' => $a->published_at?->toIso8601String(),
                    'cover_image_url' => $a->cover_image_url,
                    'auto_cover_url' => $autoCoverUrl,
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
            'embedUrl' => $embedUrl,
            'folderUrl' => $folderUrl,
            'images' => $images,
        ]);
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

        return Inertia::render('Mobile/Services', [
            'churchName' => $church?->name,
            'services' => $services,
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
            'leaderOptions' => SolicitationAssignees::leaderContactVolunteerOptions($churchId),
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

        $volunteer = Volunteer::query()
            ->whereKey((int) $valid['assigned_volunteer_id'])
            ->where('active', true)
            ->whereNotNull('user_id')
            ->whereHas('ministries', fn ($q) => $q->where('church_id', $churchId))
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

        /** Igual ao perfil móvel: contagem só para equipa do painel, não `lider_ministerio` só com permissões soltas. */
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
                    ->where('type', '!=', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
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

        return Inertia::render('Mobile/Profile', [
            'church' => $church ? [
                'name' => $church->name,
            ] : null,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'profileCounts' => [
                'atendimento_open' => $atendimentoOpen,
                'pastoral_agenda' => $pastoralAgendaItems,
                'notifications' => $notificationsTotal,
            ],
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

        $ministryOptions = $churchId > 0
            ? Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])->values()->all()
            : [];

        $user->loadMissing('volunteerProfile');
        $volunteerMinistryIds = $user->volunteerProfile
            ? $user->volunteerProfile->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
            : [];

        return Inertia::render('Mobile/ProfileEdit', [
            'mustVerifyEmail' => $user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail,
            'status' => session('status'),
            'ministryOptions' => $ministryOptions,
            'volunteerMinistryIds' => $volunteerMinistryIds,
            'profileRedirectTo' => 'mobile.profile.edit',
        ]);
    }
}
