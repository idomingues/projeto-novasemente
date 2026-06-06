<?php

namespace App\Support;

use App\Models\MissionPhase;
use App\Models\User;

final class MissionPhaseLeaders
{
    /**
     * @param  list<int>  $phaseIds
     */
    public static function syncForUser(User $user, bool $isPhaseLeader, array $phaseIds, int $churchId): void
    {
        abort_unless((int) $user->church_id === $churchId, 404);

        $phaseIdList = collect($phaseIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($isPhaseLeader && ! $user->can('mission.view')) {
            abort(422, 'Conceda a permissão «Ver Missão» ao usuário antes de marcá-lo como líder de fase.');
        }

        if ($isPhaseLeader && $phaseIdList->isEmpty()) {
            abort(422, 'Selecione ao menos uma fase para o líder de fase.');
        }

        if ($phaseIdList->isNotEmpty()) {
            $validPhaseCount = MissionPhase::query()
                ->where('church_id', $churchId)
                ->whereIn('id', $phaseIdList)
                ->count();
            abort_unless($validPhaseCount === $phaseIdList->count(), 422, 'Fase inválida para esta igreja.');
        }

        $user->forceFill(['is_mission_team' => $isPhaseLeader])->save();
        $user->missionPhases()->sync($isPhaseLeader ? $phaseIdList->all() : []);
    }
}
