<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use App\Models\Member;
use App\Models\PrayerRequest;
use App\Models\Volunteer;
use Illuminate\Http\Request;
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
            ? Member::where('church_id', $churchId)->count()
            : 0;

        $volunteerCount = 0;
        if ($churchId !== null) {
            $volunteerCount = Volunteer::query()
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

        return Inertia::render('Dashboard', [
            'upcomingEvents' => $upcomingEvents,
            'churchName' => $churchName,
            'stats' => [
                'members' => $memberCount,
                'volunteers' => $volunteerCount,
                'prayerRequests' => $prayerRequestCount,
            ],
        ]);
    }
}
