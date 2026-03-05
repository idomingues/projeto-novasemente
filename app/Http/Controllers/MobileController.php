<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchService;
use App\Models\Event;
use App\Models\Ministry;
use App\Models\News;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileController extends Controller
{
    private function currentChurch(): ?Church
    {
        return Church::where('active', true)->orderBy('name')->first();
    }

    public function index(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;

        $latestNews = News::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->limit(3)
            ->get(['id', 'title', 'slug', 'excerpt', 'image_url', 'published_at'])
            ->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'slug' => $n->slug,
                'excerpt' => $n->excerpt,
                'image_url' => $n->image_url,
                'published_at' => $n->published_at?->toIso8601String(),
            ]);

        $upcomingEvents = Event::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
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
            ]);

        return Inertia::render('Mobile/Index', [
            'church' => $church ? [
                'name' => $church->name,
                'logo_url' => $church->logo_url,
                'city' => $church->city,
                'state' => $church->state,
            ] : null,
            'latestNews' => $latestNews,
            'upcomingEvents' => $upcomingEvents,
        ]);
    }

    public function news(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $query = News::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at');

        $posts = $query->paginate(10)->withQueryString();

        $posts->getCollection()->transform(fn ($p) => [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'excerpt' => $p->excerpt,
            'body' => $p->body,
            'image_url' => $p->image_url,
            'published_at' => $p->published_at?->toIso8601String(),
        ]);

        return Inertia::render('Mobile/News', [
            'posts' => $posts,
        ]);
    }

    public function events(Request $request): Response
    {
        $churchId = $this->currentChurch()?->id;
        $events = Event::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'description' => $e->description,
                'starts_at' => $e->starts_at->toIso8601String(),
                'ends_at' => $e->ends_at?->toIso8601String(),
                'all_day' => $e->all_day,
                'location' => $e->location,
                'image_url' => $e->image_url,
                'color' => $e->color,
            ]);

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

    public function schedule(Request $request): Response
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;
        $churchId = Church::where('active', true)->orderBy('name')->value('id');

        $ministries = Ministry::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
            ->orderBy('name')
            ->get(['id', 'name']);
        $assignments = [];
        $checkinDates = [];

        if ($ministryId) {
            $startDate = Carbon::create($year, $month, 1);
            $endDate = $startDate->copy()->endOfMonth()->addDay();
            $baseQuery = ScheduleAssignment::query()
                ->with(['member', 'scheduleRole'])
                ->where('ministry_id', $ministryId);
            $oneOff = (clone $baseQuery)
                ->whereNotNull('schedule_date')
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->orderBy('schedule_date')
                ->get();
            $saturdays = $this->getSaturdays($year, $month);
            $saturdayByNumber = [];
            foreach ($saturdays as $i => $d) {
                $saturdayByNumber[$i + 1] = $d;
            }
            $recurring = (clone $baseQuery)
                ->whereNotNull('saturday_number')
                ->whereNull('schedule_date')
                ->whereIn('saturday_number', array_keys($saturdayByNumber))
                ->where(function ($q) use ($month, $year) {
                    $q->where('recurring', true)
                        ->orWhere(function ($q2) use ($month, $year) {
                            $q2->where('recurring', false)
                                ->where('assignment_month', $month)
                                ->where('assignment_year', $year);
                        });
                })
                ->orderBy('saturday_number')
                ->get();
            foreach ($oneOff as $a) {
                $assignments[] = [
                    'id' => $a->id,
                    'memberId' => $a->member_id,
                    'memberName' => $a->member->name,
                    'memberPhotoUrl' => null,
                    'roleId' => $a->schedule_role_id,
                    'roleName' => $a->scheduleRole?->name,
                    'scheduleDate' => $a->schedule_date?->format('Y-m-d'),
                    'saturdayNumber' => $a->saturday_number,
                    'status' => $a->status,
                    'startTime' => $a->start_time,
                    'endTime' => $a->end_time,
                    'checkedInAt' => $a->checked_in_at?->toIso8601String(),
                ];
            }
            foreach ($recurring as $a) {
                $computedDate = $saturdayByNumber[$a->saturday_number] ?? null;
                if (!$computedDate) {
                    continue;
                }
                $assignments[] = [
                    'id' => $a->id,
                    'memberId' => $a->member_id,
                    'memberName' => $a->member->name,
                    'memberPhotoUrl' => null,
                    'roleId' => $a->schedule_role_id,
                    'roleName' => $a->scheduleRole?->name,
                    'scheduleDate' => $computedDate->format('Y-m-d'),
                    'saturdayNumber' => $a->saturday_number,
                    'status' => $a->status,
                    'startTime' => $a->start_time,
                    'endTime' => $a->end_time,
                    'checkedInAt' => $a->checked_in_at?->toIso8601String(),
                ];
            }
            usort($assignments, fn ($x, $y) => strcmp($x['scheduleDate'] ?? '', $y['scheduleDate'] ?? ''));
            $checkinDates = ScheduleCheckinDate::query()
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->pluck('schedule_date')
                ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
                ->values()
                ->all();
        }

        return Inertia::render('Mobile/Schedule', [
            'assignments' => $assignments,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries,
        ]);
    }

    public function more(): Response
    {
        return Inertia::render('Mobile/More');
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
        $donation = null;
        if ($church && ($church->pix_key || $church->donation_url)) {
            $donation = [
                'churchName' => $church->name,
                'pix_key' => $church->pix_key,
                'donation_url' => $church->donation_url,
            ];
        }

        return Inertia::render('Mobile/Offerings', [
            'donation' => $donation,
        ]);
    }

    public function notifications(): Response
    {
        return Inertia::render('Mobile/Notifications');
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
