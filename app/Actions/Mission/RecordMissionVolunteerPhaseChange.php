<?php

namespace App\Actions\Mission;

use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\MissionVolunteerPhaseHistory;
use App\Models\User;

final class RecordMissionVolunteerPhaseChange
{
    public function __invoke(
        MissionVolunteer $volunteer,
        ?int $fromPhaseId,
        ?int $toPhaseId,
        ?User $changedBy = null,
    ): void {
        if ($fromPhaseId === $toPhaseId) {
            return;
        }

        $fromName = $fromPhaseId !== null
            ? MissionPhase::query()->whereKey($fromPhaseId)->value('name')
            : null;
        $toName = $toPhaseId !== null
            ? MissionPhase::query()->whereKey($toPhaseId)->value('name')
            : null;

        MissionVolunteerPhaseHistory::query()->create([
            'church_id' => $volunteer->church_id,
            'mission_volunteer_id' => $volunteer->id,
            'changed_by_user_id' => $changedBy?->id,
            'from_phase_id' => $fromPhaseId,
            'to_phase_id' => $toPhaseId,
            'from_phase_name' => $fromName,
            'to_phase_name' => $toName,
            'created_at' => now(),
        ]);
    }
}
