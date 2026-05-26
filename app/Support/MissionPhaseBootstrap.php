<?php

namespace App\Support;

use App\Models\MissionPhase;
use Illuminate\Support\Facades\DB;

final class MissionPhaseBootstrap
{
    private const DEFAULT_STAGES = [
        ['name' => 'Interessado', 'sort_order' => 10, 'sla_days' => 7],
        ['name' => 'Em contato', 'sort_order' => 20, 'sla_days' => 14],
        ['name' => 'Em formação', 'sort_order' => 30, 'sla_days' => 30],
        ['name' => 'Ativo no Insight', 'sort_order' => 40, 'sla_days' => 60],
    ];

    public static function ensurePhasesForChurch(int $churchId): void
    {
        if (MissionPhase::query()->where('church_id', $churchId)->exists()) {
            return;
        }

        foreach (self::DEFAULT_STAGES as $row) {
            MissionPhase::create([
                'church_id' => $churchId,
                'name' => $row['name'],
                'sort_order' => $row['sort_order'],
                'sla_days' => $row['sla_days'],
            ]);
        }
    }

    public static function defaultPhaseIdForChurch(int $churchId): ?int
    {
        self::ensurePhasesForChurch($churchId);

        $id = MissionPhase::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(name) = ?', ['interessado'])
            ->value('id');

        if ($id) {
            return (int) $id;
        }

        return MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->value('id');
    }

    public static function fallbackPhaseIdOnDelete(int $churchId, int $deletedPhaseId): ?int
    {
        $fallback = self::defaultPhaseIdForChurch($churchId);
        if ($fallback && $fallback !== $deletedPhaseId) {
            return $fallback;
        }

        return MissionPhase::query()
            ->where('church_id', $churchId)
            ->where('id', '!=', $deletedPhaseId)
            ->orderBy('sort_order')
            ->value('id');
    }

    public static function reassignVolunteersFromPhase(int $churchId, int $fromPhaseId, int $toPhaseId): void
    {
        DB::table('mission_volunteers')
            ->where('church_id', $churchId)
            ->where('mission_phase_id', $fromPhaseId)
            ->update([
                'mission_phase_id' => $toPhaseId,
                'phase_entered_at' => now(),
                'updated_at' => now(),
            ]);
    }
}
