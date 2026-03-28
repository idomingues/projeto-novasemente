<?php

namespace App\Http\Controllers;

use App\Models\AcervoItem;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\Culto;
use App\Models\Event;
use App\Models\Member;
use App\Models\Musica;
use App\Models\News;
use App\Models\Pastor;
use App\Models\ScheduleCheckinDate;
use App\Models\UserInboxNotification;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\VolunteerScheduleOverview;
use App\Support\NotificationFeed;
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

        $latestNews = News::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'title', 'slug', 'excerpt', 'image_url', 'published_at'])
            ->map(function ($n) {
                $imageUrl = $n->image_url;
                if ($imageUrl && ! str_starts_with($imageUrl, 'http')) {
                    $imageUrl = request()->getSchemeAndHttpHost().$imageUrl;
                }

                return [
                    'id' => $n->id,
                    'title' => $n->title,
                    'slug' => $n->slug,
                    'excerpt' => $n->excerpt,
                    'image_url' => $imageUrl,
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
        $posts->getCollection()->transform(function ($p) use ($baseUrl) {
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
                'image_url' => $imageUrl,
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
                'image_url' => $imageUrl,
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

    private function memberPhotoPublicUrl(?Member $member): ?string
    {
        if (! $member || empty($member->photo_url)) {
            return null;
        }
        $u = $member->photo_url;
        if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) {
            return $u;
        }
        $base = request()->getSchemeAndHttpHost();

        return $base.(str_starts_with($u, '/') ? '' : '/').$u;
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
        $memberId = $user->member_id ? (int) $user->member_id : null;

        if (! $memberId) {
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

        $member = Member::find($memberId);
        $overview = VolunteerScheduleOverview::forMember(
            $memberId,
            $year,
            $month,
            fn ($m) => $this->memberPhotoPublicUrl($m)
        );

        return Inertia::render('Mobile/VolunteerSchedule', [
            'canViewSchedule' => true,
            'month' => $month,
            'year' => $year,
            'memberName' => $member?->name ?? $user->name,
            'memberPhotoUrl' => $this->memberPhotoPublicUrl($member),
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

        if (! $user || ! $user->member_id) {
            return Inertia::render('Mobile/ScheduleCheckin', [
                'date' => $valid['date'],
                'dateLabel' => $date->translatedFormat('d/m/Y'),
                'assignments' => [],
                'checkinEnabled' => ScheduleCheckinDate::where('schedule_date', $date)->exists(),
                'ministryName' => null,
                'needsMember' => true,
            ]);
        }

        $assignments = ScheduleAssignmentPresenter::assignmentsForMemberOnDate(
            (int) $user->member_id,
            $valid['date'],
            fn ($m) => $this->memberPhotoPublicUrl($m)
        );

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

    public function contact(): Response
    {
        $church = $this->currentChurch();
        $contact = null;
        if ($church) {
            $contact = [
                'name' => $church->name,
                'email' => $church->email,
                'phone' => $church->phone,
                'whatsapp' => $church->whatsapp,
                'address' => $church->address,
                'city' => $church->city,
                'state' => $church->state,
            ];
        }

        return Inertia::render('Mobile/Contact', [
            'contact' => $contact,
        ]);
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
}
