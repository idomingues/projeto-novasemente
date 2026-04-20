<?php

namespace App\Http\Controllers;

use App\Models\AcervoItem;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\ChurchSolicitation;
use App\Models\Culto;
use App\Models\Event;
use App\Models\Musica;
use App\Models\News;
use App\Models\Pastor;
use App\Models\ScheduleCheckinDate;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\SolicitationChatNotifier;
use App\Services\VolunteerScheduleOverview;
use App\Support\NotificationFeed;
use App\Support\ScheduleBoardViewData;
use App\Support\SolicitationAssignees;
use Carbon\Carbon;
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

        $upcomingEvents = Event::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->where('starts_at', '>=', now()->startOfDay())
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
            'nextUrl' => route('mobile.news', [], false),
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

        return Inertia::render('Mobile/Culto', [
            'cultos' => $cultos,
            'showPostRegistrationBanner' => $request->boolean('reg_ok') && $request->user() !== null,
        ]);
    }

    public function musica(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $musicas = Musica::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
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
        $events = Event::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
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

    public function schedule(Request $request): Response
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

        if (ScheduleBoardViewData::userSeesMinistryScheduleBoard($user)) {
            return Inertia::render('Mobile/MinistrySchedule', ScheduleBoardViewData::forIndexRequest($request));
        }

        $workingChurchId = Church::resolveWorkingId($request);
        if (! $user->church_id || (int) $user->church_id !== (int) $workingChurchId) {
            return Inertia::render('Mobile/VolunteerSchedule', [
                'canViewSchedule' => true,
                'month' => $month,
                'year' => $year,
                'memberName' => $user->name,
                'memberPhotoUrl' => null,
                'needsMember' => true,
                'volunteerOverview' => null,
            ]);
        }

        $overview = VolunteerScheduleOverview::forMember(
            (int) $user->id,
            $year,
            $month,
            fn ($u) => $this->userPhotoPublicUrl($u)
        );

        return Inertia::render('Mobile/VolunteerSchedule', [
            'canViewSchedule' => true,
            'month' => $month,
            'year' => $year,
            'memberName' => $user->name,
            'memberPhotoUrl' => $this->userPhotoPublicUrl($user),
            'needsMember' => false,
            'volunteerOverview' => $overview,
        ]);
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

    public function fotosComingSoon(): RedirectResponse
    {
        return redirect()->away(
            'https://drive.google.com/drive/folders/1AfwOOlfQhITwltHy0BUTT3TfkT-soDUQ',
        );
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

    public function leaderContact(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = Church::resolveWorkingId($request);

        $contactUrl = route('mobile.contact');
        $myLeaderChats = ChurchSolicitation::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where('user_id', $user->id)
            ->where('type', 'leader_chat')
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
            'mineUrl' => route('mobile.solicitations.hub', ['lista' => '1']),
            'leaderInboxUrl' => route('mobile.leader-solicitations.index'),
            'locationUrl' => route('mobile.location'),
            'myLeaderChats' => $myLeaderChats,
        ]);
    }

    public function leaderContactStore(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
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

        $user = request()->user();

        return Inertia::render('Mobile/AcervoIndex', [
            'items' => $items,
            'canManage' => $user !== null && $user->can('music.manage'),
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

        return redirect()->route('pastoral-agenda.index');
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

        return Inertia::render('Mobile/Profile', [
            'church' => $church ? [
                'name' => $church->name,
            ] : null,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }
}
