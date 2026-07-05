<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

final class MissionVolunteerFilteredRoster
{
    /**
     * @return Collection<int, MissionVolunteer>
     */
    public static function collect(int $churchId, Request $request): Collection
    {
        $query = MissionVolunteer::query()
            ->with('phase:id,name,sort_order,sla_days')
            ->where('church_id', $churchId)
            ->registrationComplete();

        MissionVolunteerRosterFilters::apply($request, $query);

        $phaseFilter = trim((string) $request->input('mission_phase_id', ''));
        if ($phaseFilter !== '') {
            $query->where('mission_phase_id', (int) $phaseFilter);
        }

        MissionVolunteerRosterFilters::applySort($request, $query);

        /** @var Collection<int, MissionVolunteer> $volunteers */
        $volunteers = $query->get();

        MissionSla::warmPhaseEntryCache($volunteers);

        if ($request->boolean('overdue')) {
            $volunteers = $volunteers
                ->filter(fn (MissionVolunteer $v) => MissionSla::metricsForVolunteer($v)['isOverdue'])
                ->values();
        }

        $hasAppAccount = $request->input('has_app_account');
        if ($hasAppAccount === '0' || $hasAppAccount === '1' || $hasAppAccount === 0 || $hasAppAccount === 1) {
            $wantsYes = (bool) (int) $hasAppAccount;
            $volunteers = $volunteers
                ->filter(fn (MissionVolunteer $v) => (MissionVolunteerAccountResolver::userForVolunteer($v) !== null) === $wantsYes)
                ->values();
        }

        return $volunteers;
    }
}
