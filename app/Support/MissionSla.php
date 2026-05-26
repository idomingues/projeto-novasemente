<?php

namespace App\Support;

use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\MissionVolunteerPhaseHistory;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

final class MissionSla
{
    /** @var array<int, array<int, CarbonInterface>> mission_volunteer_id => to_phase_id => entered_at */
    private static array $phaseEntryCache = [];

    /**
     * Pré-carrega datas de entrada por fase (evita N+1 no índice Missão).
     *
     * @param  iterable<int, MissionVolunteer>|Collection<int, MissionVolunteer>  $volunteers
     */
    public static function warmPhaseEntryCache(iterable $volunteers): void
    {
        $ids = collect($volunteers)->pluck('id')->filter()->unique()->values()->all();
        if ($ids === []) {
            return;
        }

        $rows = MissionVolunteerPhaseHistory::query()
            ->whereIn('mission_volunteer_id', $ids)
            ->orderByDesc('created_at')
            ->get(['mission_volunteer_id', 'to_phase_id', 'created_at']);

        foreach ($rows as $row) {
            $volunteerId = (int) $row->mission_volunteer_id;
            $phaseId = (int) $row->to_phase_id;
            if ($phaseId < 1 || isset(self::$phaseEntryCache[$volunteerId][$phaseId])) {
                continue;
            }
            $at = $row->created_at;
            if ($at instanceof CarbonInterface) {
                self::$phaseEntryCache[$volunteerId][$phaseId] = $at;
            }
        }
    }

    public static function clearPhaseEntryCache(): void
    {
        self::$phaseEntryCache = [];
    }

    /**
     * @return array{
     *     daysInPhase: int,
     *     slaDays: int|null,
     *     isOverdue: bool,
     *     daysOverdue: int|null,
     *     phaseEnteredAt: string|null,
     *     phaseEnteredAtLabel: string|null
     * }
     */
    public static function metricsForVolunteer(MissionVolunteer $volunteer, ?MissionPhase $phase = null): array
    {
        $phase ??= $volunteer->relationLoaded('phase') ? $volunteer->phase : $volunteer->phase()->first();

        $enteredAt = self::resolvePhaseEnteredAt($volunteer);
        $daysInPhase = $enteredAt instanceof CarbonInterface
            ? (int) $enteredAt->copy()->startOfDay()->diffInDays(now()->startOfDay())
            : 0;

        $phaseEnteredAt = $enteredAt?->toIso8601String();
        $phaseEnteredAtLabel = $enteredAt?->format('d/m/Y');

        $slaDays = $phase?->sla_days !== null ? (int) $phase->sla_days : null;

        if ($slaDays === null || $slaDays < 1) {
            return [
                'daysInPhase' => $daysInPhase,
                'slaDays' => $slaDays,
                'isOverdue' => false,
                'daysOverdue' => null,
                'phaseEnteredAt' => $phaseEnteredAt,
                'phaseEnteredAtLabel' => $phaseEnteredAtLabel,
            ];
        }

        $isOverdue = $daysInPhase > $slaDays;

        return [
            'daysInPhase' => $daysInPhase,
            'slaDays' => $slaDays,
            'isOverdue' => $isOverdue,
            'daysOverdue' => $isOverdue ? $daysInPhase - $slaDays : null,
            'phaseEnteredAt' => $phaseEnteredAt,
            'phaseEnteredAtLabel' => $phaseEnteredAtLabel,
        ];
    }

    public static function resolvePhaseEnteredAt(MissionVolunteer $volunteer): ?CarbonInterface
    {
        $phaseId = $volunteer->mission_phase_id !== null ? (int) $volunteer->mission_phase_id : null;

        if ($phaseId !== null) {
            $volunteerId = (int) $volunteer->id;
            $cached = self::$phaseEntryCache[$volunteerId][$phaseId] ?? null;
            if ($cached instanceof CarbonInterface) {
                return $cached;
            }

            $fromHistory = MissionVolunteerPhaseHistory::query()
                ->where('mission_volunteer_id', $volunteer->id)
                ->where('to_phase_id', $phaseId)
                ->orderByDesc('created_at')
                ->value('created_at');

            if ($fromHistory !== null) {
                return $fromHistory instanceof CarbonInterface
                    ? $fromHistory
                    : Carbon::parse($fromHistory);
            }
        }

        $enteredAt = $volunteer->phase_entered_at ?? $volunteer->created_at;

        return $enteredAt instanceof CarbonInterface ? $enteredAt : null;
    }
}
