<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class MissionTeamAccess
{
    public static function canManagePhases(User $user): bool
    {
        return $user->can('mission.manage');
    }

    public static function canManageMissionTeam(User $user): bool
    {
        return $user->can('mission.manage');
    }

    /**
     * IDs de fases em que o usuário pode mover cadastros. Null = todas (gestor).
     *
     * @return list<int>|null
     */
    public static function operablePhaseIds(User $user): ?array
    {
        if ($user->can('mission.manage')) {
            return null;
        }

        if (! (bool) ($user->is_mission_team ?? false) || ! $user->can('mission.view')) {
            return [];
        }

        return DB::table('mission_user_phases')
            ->where('user_id', $user->id)
            ->pluck('mission_phase_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function canOperateVolunteer(User $user, ?int $currentPhaseId): bool
    {
        if ($currentPhaseId === null) {
            return false;
        }

        $allowed = self::operablePhaseIds($user);

        if ($allowed === null) {
            return true;
        }

        return in_array($currentPhaseId, $allowed, true);
    }

}
