<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\LeaderVolunteerBirthdays;
use App\Support\NsWhatsAccess;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileLeaderBirthdaysController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless(NsWhatsAccess::isMinistryLeaderAccount($user), 403);

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $month = max(1, min(12, (int) $request->query('month', now()->month)));
        $year = max(2000, min(2100, (int) $request->query('year', now()->year)));
        $reference = Carbon::create($year, $month, 1)->startOfDay();

        $ministryIds = $user->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $birthdays = LeaderVolunteerBirthdays::forMonth((int) $churchId, $ministryIds, $reference);
        $todayCount = collect($birthdays)->where('isToday', true)->count();

        $church = Church::query()->whereKey((int) $churchId)->first(['id', 'name']);

        return Inertia::render('Mobile/LeaderBirthdays', [
            'month' => $month,
            'year' => $year,
            'monthLabel' => $reference->locale('pt_BR')->translatedFormat('F Y'),
            'churchName' => $church?->name ? (string) $church->name : 'Igreja',
            'birthdays' => $birthdays,
            'todayCount' => $todayCount,
            'isCurrentMonth' => $month === (int) now()->month && $year === (int) now()->year,
        ]);
    }
}
