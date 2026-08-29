<?php

namespace App\Services;

use App\Models\ScheduleCoordinator;
use App\Models\ScheduleCoordinatorSkip;
use App\Models\User;
use Carbon\Carbon;

class ScheduleCoordinatorPresenter
{
    /**
     * Coordenadores visíveis no mês (um por sábado / data extra).
     * Atribuição só deste mês tem prioridade sobre a série recorrente.
     *
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function monthCoordinatorsForMinistry(
        int $ministryId,
        int $year,
        int $month,
        callable $userPhotoUrl
    ): array {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth()->addDay();

        $baseQuery = ScheduleCoordinator::query()
            ->with(['user', 'volunteer.user'])
            ->where('ministry_id', $ministryId);

        $oneOff = (clone $baseQuery)
            ->whereNotNull('schedule_date')
            ->where('schedule_date', '>=', $startDate)
            ->where('schedule_date', '<', $endDate)
            ->orderBy('schedule_date')
            ->get();

        $saturdays = ScheduleAssignmentPresenter::getSaturdays($year, $month);
        $saturdayByNumber = [];
        foreach ($saturdays as $i => $d) {
            $saturdayByNumber[$i + 1] = $d;
        }

        $templates = (clone $baseQuery)
            ->whereNotNull('saturday_number')
            ->whereNull('schedule_date')
            ->whereIn('saturday_number', array_keys($saturdayByNumber))
            ->where(function ($q) use ($month, $year) {
                $q->where('recurring', true)
                    ->orWhere(function ($q2) use ($month, $year) {
                        $q2->where('recurring', false)
                            ->where('assignment_month', $month)
                            ->where('assignment_year', $year);
                    });
            })
            ->orderBy('saturday_number')
            ->get();

        $skipsByCoordinator = ScheduleCoordinatorSkip::query()
            ->whereIn('schedule_coordinator_id', $templates->pluck('id'))
            ->get()
            ->groupBy('schedule_coordinator_id');

        $bySlot = [];

        foreach ($oneOff as $row) {
            $dateKey = $row->schedule_date?->format('Y-m-d');
            if ($dateKey === null) {
                continue;
            }
            $bySlot['extra:'.$dateKey] = self::rowFromCoordinator($row, $dateKey, $userPhotoUrl, false);
        }

        $monthScopedBySaturday = [];
        $recurringBySaturday = [];

        foreach ($templates as $row) {
            $num = (int) $row->saturday_number;
            $computedDate = $saturdayByNumber[$num] ?? null;
            if (! $computedDate) {
                continue;
            }
            $dateKey = $computedDate->format('Y-m-d');
            $skipDates = $skipsByCoordinator->get($row->id, collect())->map(fn ($s) => $s->occurrence_date->format('Y-m-d'));
            if ($skipDates->contains($dateKey)) {
                continue;
            }

            $payload = self::rowFromCoordinator($row, $dateKey, $userPhotoUrl, $row->isRecurringSeries());
            if ($row->isRecurringSeries()) {
                $recurringBySaturday[$num] = $payload;
            } else {
                $monthScopedBySaturday[$num] = $payload;
            }
        }

        foreach ($saturdayByNumber as $num => $date) {
            $payload = $monthScopedBySaturday[$num] ?? $recurringBySaturday[$num] ?? null;
            if ($payload !== null) {
                $bySlot['sat:'.$num] = $payload;
            }
        }

        return array_values($bySlot);
    }

    /**
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<string, mixed>
     */
    private static function rowFromCoordinator(
        ScheduleCoordinator $row,
        string $dateYmd,
        callable $userPhotoUrl,
        bool $recurringSeries
    ): array {
        $vol = $row->volunteer;
        $user = $row->user ?? $vol?->user;
        $name = $user?->name ?? $vol?->display_name ?? 'Sem nome';

        return [
            'id' => (int) $row->id,
            'volunteerId' => (int) $row->volunteer_id,
            'memberId' => $row->user_id !== null ? (int) $row->user_id : null,
            'memberName' => $name,
            'memberPhotoUrl' => $user ? $userPhotoUrl($user) : null,
            'hasAppAccount' => $row->user_id !== null,
            'saturdayNumber' => $row->saturday_number !== null ? (int) $row->saturday_number : null,
            'scheduleDate' => $row->schedule_date !== null ? $row->schedule_date->format('Y-m-d') : $dateYmd,
            'recurringSeries' => $recurringSeries,
        ];
    }
}
