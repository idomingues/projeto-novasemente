<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use App\Models\PageViewDailyStat;
use App\Models\PrayerRequest;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\PageViewRouteLabels;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);

        $upcomingEvents = collect();
        if ($churchId !== null) {
            $upcomingEvents = Event::query()
                ->where('church_id', $churchId)
                ->where('starts_at', '>=', now()->startOfDay())
                ->orderBy('starts_at')
                ->limit(3)
                ->get()
                ->map(fn (Event $e) => [
                    'id' => $e->id,
                    'title' => $e->title,
                    'starts_at' => $e->starts_at?->toIso8601String(),
                    'ends_at' => $e->ends_at?->toIso8601String(),
                    'all_day' => $e->all_day,
                    'location' => $e->location,
                    'price' => $e->price,
                ]);
        }

        $memberCount = $churchId !== null
            ? User::where('church_id', $churchId)->count()
            : 0;

        $volunteerCount = 0;
        if ($churchId !== null) {
            $volunteerCount = Volunteer::query()
                ->where('app_access_only', false)
                ->where(function ($q) use ($churchId) {
                    $q->whereDoesntHave('ministries')
                        ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
                })
                ->count();
        }

        $prayerRequestCount = PrayerRequest::query()
            ->where(function ($q) use ($churchId) {
                $q->whereNull('church_id');
                if ($churchId !== null) {
                    $q->orWhere('church_id', $churchId);
                }
            })
            ->count();

        $churchName = $churchId !== null ? Church::where('id', $churchId)->value('name') : null;

        $topPages = [];
        $pageViewsDays = max(1, (int) config('page-views.dashboard_days', 14));
        if (
            config('page-views.enabled', true)
            && Schema::hasTable('page_view_daily_stats')
            && $churchId !== null
        ) {
            $since = now()->subDays($pageViewsDays - 1)->startOfDay();
            $limit = max(1, (int) config('page-views.dashboard_top_limit', 12));
            $rows = PageViewDailyStat::query()
                ->where('church_id', (int) $churchId)
                ->where('visited_on', '>=', $since->toDateString())
                ->selectRaw('route_name, SUM(views) as total_views')
                ->groupBy('route_name')
                ->orderByDesc('total_views')
                ->limit($limit)
                ->get();

            $topPages = $rows->map(fn ($row) => [
                'routeName' => $row->route_name,
                'label' => PageViewRouteLabels::label((string) $row->route_name),
                'views' => (int) $row->total_views,
            ])->values()->all();
        }

        return Inertia::render('Dashboard', [
            'upcomingEvents' => $upcomingEvents,
            'churchName' => $churchName,
            'stats' => [
                'members' => $memberCount,
                'volunteers' => $volunteerCount,
                'prayerRequests' => $prayerRequestCount,
            ],
            'topPages' => $topPages,
            'pageViewsPeriodDays' => $churchId !== null ? $pageViewsDays : null,
        ]);
    }
}
