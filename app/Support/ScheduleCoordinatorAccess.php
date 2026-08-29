<?php

namespace App\Support;

use App\Models\ScheduleCoordinator;
use App\Models\User;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\ScheduleCoordinatorPresenter;
use Carbon\Carbon;

class ScheduleCoordinatorAccess
{
    public static function isCoordinatorAccount(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return self::coordinatedMinistryIds($user) !== [];
    }

    /**
     * @return array<int, int>
     */
    public static function coordinatedMinistryIds(User $user): array
    {
        $volunteerId = $user->volunteerProfile?->id;

        return ScheduleCoordinator::query()
            ->where(function ($q) use ($user, $volunteerId) {
                $q->where('user_id', $user->id);
                if ($volunteerId) {
                    $q->orWhere('volunteer_id', (int) $volunteerId);
                }
            })
            ->distinct()
            ->pluck('ministry_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public static function canAssignCoordinator(?User $user, ?int $ministryId): bool
    {
        if (! $user || ! $ministryId) {
            return false;
        }
        if ($user->hasRole('admin') || $user->hasRole('super_admin') || $user->can('escalas.manage')) {
            return true;
        }

        return $user->isMinistryLeaderAccount()
            && $user->ministries()->where('ministries.id', $ministryId)->exists();
    }

    public static function canManageMinistrySchedule(?User $user, int $ministryId): bool
    {
        return self::canAssignCoordinator($user, $ministryId);
    }

    /**
     * O usuário coordena este sábado / data extra no mês indicado.
     */
    public static function coordinatesSlot(
        ?User $user,
        int $ministryId,
        ?int $saturdayNumber,
        ?string $scheduleDate,
        int $year,
        int $month
    ): bool {
        if (! $user) {
            return false;
        }

        $rows = ScheduleCoordinatorPresenter::monthCoordinatorsForMinistry(
            $ministryId,
            $year,
            $month,
            fn () => null
        );

        $volunteerId = $user->volunteerProfile?->id;
        $userId = (int) $user->id;

        foreach ($rows as $row) {
            $samePerson = ((int) $row['memberId'] === $userId)
                || ($volunteerId !== null && (int) $row['volunteerId'] === (int) $volunteerId);
            if (! $samePerson) {
                continue;
            }

            if ($saturdayNumber !== null && (int) ($row['saturdayNumber'] ?? 0) === (int) $saturdayNumber) {
                return true;
            }
            if ($scheduleDate !== null && ($row['saturdayNumber'] ?? null) === null && ($row['scheduleDate'] ?? null) === $scheduleDate) {
                return true;
            }
        }

        return false;
    }

    /**
     * Pode montar a equipe neste sábado / data (líder ou coordenador do slot).
     */
    public static function canEditDay(
        ?User $user,
        int $ministryId,
        ?int $saturdayNumber,
        ?string $scheduleDate,
        int $year,
        int $month
    ): bool {
        if (self::canAssignCoordinator($user, $ministryId)) {
            return true;
        }

        return self::coordinatesSlot($user, $ministryId, $saturdayNumber, $scheduleDate, $year, $month);
    }

    /**
     * Coordenador recorrente deste sábado (pode criar série em todos os meses).
     */
    public static function coordinatesRecurringSaturday(?User $user, int $ministryId, int $saturdayNumber): bool
    {
        if (! $user) {
            return false;
        }

        $volunteerId = $user->volunteerProfile?->id;

        return ScheduleCoordinator::query()
            ->where('ministry_id', $ministryId)
            ->where('saturday_number', $saturdayNumber)
            ->whereNull('schedule_date')
            ->where('recurring', true)
            ->where(function ($q) use ($user, $volunteerId) {
                $q->where('user_id', $user->id);
                if ($volunteerId) {
                    $q->orWhere('volunteer_id', (int) $volunteerId);
                }
            })
            ->exists();
    }

    public static function occurrenceMatchesRecurringCoordinator(ScheduleCoordinator $coordinator, string $occurrenceYmd): bool
    {
        if ($coordinator->saturday_number === null || $coordinator->schedule_date !== null) {
            return false;
        }

        $od = Carbon::parse($occurrenceYmd)->startOfDay();
        $saturdays = ScheduleAssignmentPresenter::getSaturdays((int) $od->year, (int) $od->month);
        $expected = $saturdays[$coordinator->saturday_number - 1] ?? null;

        return $expected !== null && $expected->isSameDay($od);
    }
}
