<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\LeaderVolunteerBirthdays;
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

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);
        abort_unless(LeaderVolunteerBirthdays::canAccess($user, (int) $churchId), 403);

        $month = max(1, min(12, (int) $request->query('month', now()->month)));
        $year = max(2000, min(2100, (int) $request->query('year', now()->year)));
        $reference = Carbon::create($year, $month, 1)->startOfDay();

        $canViewAllVolunteers = LeaderVolunteerBirthdays::isChurchAdmin($user);
        $ministryIds = LeaderVolunteerBirthdays::ministryIdsForUser($user, (int) $churchId);

        // ADM vê a igreja inteira por padrão (com ou sem área própria).
        // «Minha área» continua disponível quando há ministérios vinculados.
        $defaultScope = $canViewAllVolunteers ? 'all' : 'area';
        $requestedScope = (string) $request->query('scope', $defaultScope);
        $scope = 'area';
        if ($canViewAllVolunteers && $requestedScope === 'all') {
            $scope = 'all';
        } elseif ($canViewAllVolunteers && $ministryIds === []) {
            // ADM sem área própria: lista completa é o único escopo útil.
            $scope = 'all';
        }

        $allChurch = $scope === 'all';
        $birthdays = LeaderVolunteerBirthdays::forMonth(
            (int) $churchId,
            $ministryIds,
            $reference,
            (int) $user->id,
            $allChurch,
            $allChurch ? 'name' : 'day',
        );
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
            'nsWhatsEnabled' => \Illuminate\Support\Facades\Route::has('mobile.ns-whats.index'),
            'canViewAllVolunteers' => $canViewAllVolunteers,
            'scope' => $scope,
            'hasAreaScope' => $ministryIds !== [],
        ]);
    }
}
