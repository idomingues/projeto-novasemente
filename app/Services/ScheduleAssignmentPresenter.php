<?php

namespace App\Services;

use App\Models\ScheduleAssignment;
use App\Models\ScheduleOccurrenceRoleOverride;
use App\Models\ScheduleOccurrenceSkip;
use App\Models\User;
use Carbon\Carbon;

class ScheduleAssignmentPresenter
{
    public static function participantKey(ScheduleAssignment $a): string
    {
        if ($a->volunteer_id) {
            return 'v:'.$a->volunteer_id;
        }
        if ($a->user_id) {
            return 'm:'.$a->user_id;
        }

        return 'a:'.$a->id;
    }

    /**
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array{memberId: int|null, volunteerId: int|null, memberName: string, memberPhotoUrl: ?string, participantKey: string}
     */
    private static function assigneeFace(ScheduleAssignment $a, callable $userPhotoUrl): array
    {
        $vol = $a->volunteer;
        $user = $a->user ?? $vol?->user;
        $displayUser = $user;
        $name = $user?->name ?? $vol?->display_name ?? 'Sem nome';

        return [
            'memberId' => $a->user_id !== null ? (int) $a->user_id : null,
            'volunteerId' => $a->volunteer_id !== null ? (int) $a->volunteer_id : null,
            'memberName' => $name,
            'memberPhotoUrl' => $displayUser ? $userPhotoUrl($displayUser) : null,
            'participantKey' => self::participantKey($a),
        ];
    }

    private static function participantOccurrenceKey(ScheduleAssignment $a, string $dateYmd): string
    {
        return self::participantKey($a).'|'.$a->ministry_id.'|'.$dateYmd;
    }

    /**
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function monthAssignmentsForMinistry(
        int $ministryId,
        int $year,
        int $month,
        callable $userPhotoUrl
    ): array {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth()->addDay();

        $baseQuery = ScheduleAssignment::query()
            ->with(['user', 'volunteer.user', 'scheduleRole', 'ministry'])
            ->where('ministry_id', $ministryId);

        $oneOff = (clone $baseQuery)
            ->whereNotNull('schedule_date')
            ->where('schedule_date', '>=', $startDate)
            ->where('schedule_date', '<', $endDate)
            ->orderBy('schedule_date')
            ->get();

        $saturdays = self::getSaturdays($year, $month);
        $saturdayByNumber = [];
        foreach ($saturdays as $i => $d) {
            $saturdayByNumber[$i + 1] = $d;
        }

        $recurring = (clone $baseQuery)
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

        $recurringIds = $recurring->pluck('id');
        $skipsByAssignment = ScheduleOccurrenceSkip::query()
            ->whereIn('schedule_assignment_id', $recurringIds)
            ->get()
            ->groupBy('schedule_assignment_id');
        $overrides = ScheduleOccurrenceRoleOverride::query()
            ->whereIn('schedule_assignment_id', $recurringIds)
            ->with('scheduleRole')
            ->get()
            ->keyBy(fn (ScheduleOccurrenceRoleOverride $o) => $o->schedule_assignment_id.'|'.$o->occurrence_date->format('Y-m-d'));

        $assignments = [];

        foreach ($oneOff as $a) {
            $assignments[] = self::rowFromOneOff($a, $userPhotoUrl);
        }

        $oneOffKeys = [];
        foreach ($oneOff as $a) {
            $dk = $a->schedule_date?->format('Y-m-d');
            if ($dk !== null) {
                $oneOffKeys[self::participantOccurrenceKey($a, $dk)] = true;
            }
        }

        foreach ($recurring as $a) {
            $computedDate = $saturdayByNumber[$a->saturday_number] ?? null;
            if (! $computedDate) {
                continue;
            }
            $dateKey = $computedDate->format('Y-m-d');
            if (isset($oneOffKeys[self::participantOccurrenceKey($a, $dateKey)])) {
                continue;
            }
            $skipDates = $skipsByAssignment->get($a->id, collect())->map(fn ($s) => $s->occurrence_date->format('Y-m-d'));
            if ($skipDates->contains($dateKey)) {
                continue;
            }
            $override = $overrides->get($a->id.'|'.$dateKey);
            $assignments[] = self::rowFromRecurring($a, $computedDate, $userPhotoUrl, $override);
        }

        usort($assignments, fn ($x, $y) => strcmp($x['scheduleDate'] ?? '', $y['scheduleDate'] ?? ''));

        return $assignments;
    }

    /**
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<string, mixed>
     */
    public static function rowFromOneOff(ScheduleAssignment $a, callable $userPhotoUrl): array
    {
        $face = self::assigneeFace($a, $userPhotoUrl);

        return array_merge($face, [
            'id' => $a->id,
            'ministryName' => $a->ministry?->name,
            'roleId' => $a->schedule_role_id,
            'roleName' => $a->scheduleRole?->name,
            'scheduleDate' => $a->schedule_date?->format('Y-m-d'),
            'saturdayNumber' => $a->saturday_number,
            'sourceRecurring' => false,
            'recurringSeries' => false,
            'status' => $a->status,
            'startTime' => $a->start_time,
            'endTime' => $a->end_time,
            'checkedInAt' => $a->checked_in_at?->toIso8601String(),
        ]);
    }

    /**
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<string, mixed>
     */
    public static function rowFromRecurring(
        ScheduleAssignment $a,
        Carbon $computedDate,
        callable $userPhotoUrl,
        ?ScheduleOccurrenceRoleOverride $override = null
    ): array {
        $roleId = $override ? $override->schedule_role_id : $a->schedule_role_id;
        $roleName = $override
            ? ($override->schedule_role_id === null ? null : $override->scheduleRole?->name)
            : $a->scheduleRole?->name;

        $recurringSeries = $a->recurring && $a->saturday_number !== null && $a->schedule_date === null;

        $face = self::assigneeFace($a, $userPhotoUrl);

        return array_merge($face, [
            'id' => $a->id,
            'ministryName' => $a->ministry?->name,
            'roleId' => $roleId,
            'roleName' => $roleName,
            'scheduleDate' => $computedDate->format('Y-m-d'),
            'saturdayNumber' => $a->saturday_number,
            'sourceRecurring' => true,
            'recurringSeries' => $recurringSeries,
            'status' => $a->status,
            'startTime' => $a->start_time,
            'endTime' => $a->end_time,
            'checkedInAt' => $a->checked_in_at?->toIso8601String(),
        ]);
    }

    /** @return array<int, Carbon> */
    public static function getSaturdays(int $year, int $month): array
    {
        $saturdays = [];
        $date = Carbon::create($year, $month, 1);
        while ($date->month === $month) {
            if ($date->dayOfWeek === Carbon::SATURDAY) {
                $saturdays[] = $date->copy();
            }
            $date->addDay();
        }

        return $saturdays;
    }

    /**
     * Todas as linhas de escala de um utilizador numa data (vários departamentos).
     * `memberId` no resultado é o id em `users` (compatibilidade com API anterior).
     *
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function assignmentsForMemberOnDate(
        int $userId,
        string $dateYmd,
        callable $userPhotoUrl
    ): array {
        $date = Carbon::parse($dateYmd)->startOfDay();
        $month = (int) $date->month;
        $year = (int) $date->year;
        $out = [];

        $oneOffs = ScheduleAssignment::query()
            ->with(['user', 'volunteer.user', 'scheduleRole', 'ministry'])
            ->where('user_id', $userId)
            ->whereDate('schedule_date', $date)
            ->get();

        foreach ($oneOffs as $a) {
            $out[] = self::rowFromOneOff($a, $userPhotoUrl);
        }

        $oneOffKeys = [];
        foreach ($oneOffs as $a) {
            $oneOffKeys[self::participantOccurrenceKey($a, $date->format('Y-m-d'))] = true;
        }

        $saturdays = self::getSaturdays($year, $month);
        $saturdayByNumber = [];
        foreach ($saturdays as $i => $d) {
            $saturdayByNumber[$i + 1] = $d;
        }

        $targetSaturday = null;
        foreach ($saturdayByNumber as $num => $d) {
            if ($d->isSameDay($date)) {
                $targetSaturday = $num;
                break;
            }
        }

        if ($targetSaturday === null) {
            return $out;
        }

        $computedDate = $saturdayByNumber[$targetSaturday] ?? null;
        if (! $computedDate) {
            return $out;
        }

        $dateKey = $computedDate->format('Y-m-d');

        $recurring = ScheduleAssignment::query()
            ->with(['user', 'volunteer.user', 'scheduleRole', 'ministry'])
            ->where('user_id', $userId)
            ->whereNull('schedule_date')
            ->where('saturday_number', $targetSaturday)
            ->where(function ($q) use ($month, $year) {
                $q->where('recurring', true)
                    ->orWhere(function ($q2) use ($month, $year) {
                        $q2->where('recurring', false)
                            ->where('assignment_month', $month)
                            ->where('assignment_year', $year);
                    });
            })
            ->get();

        foreach ($recurring as $a) {
            if (isset($oneOffKeys[self::participantOccurrenceKey($a, $dateKey)])) {
                continue;
            }

            if (ScheduleOccurrenceSkip::query()
                ->where('schedule_assignment_id', $a->id)
                ->whereDate('occurrence_date', $dateKey)
                ->exists()) {
                continue;
            }

            $override = ScheduleOccurrenceRoleOverride::query()
                ->where('schedule_assignment_id', $a->id)
                ->whereDate('occurrence_date', $dateKey)
                ->with('scheduleRole')
                ->first();

            $out[] = self::rowFromRecurring($a, $computedDate, $userPhotoUrl, $override);
        }

        return $out;
    }

    /**
     * Linhas de escala ligadas ao registo de voluntário (sem depender de membro).
     *
     * @param  callable(User|null): ?string  $userPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function assignmentsForVolunteerOnDate(
        int $volunteerId,
        string $dateYmd,
        callable $userPhotoUrl
    ): array {
        $date = Carbon::parse($dateYmd)->startOfDay();
        $month = (int) $date->month;
        $year = (int) $date->year;
        $out = [];

        $oneOffs = ScheduleAssignment::query()
            ->with(['user', 'volunteer.user', 'scheduleRole', 'ministry'])
            ->where('volunteer_id', $volunteerId)
            ->whereDate('schedule_date', $date)
            ->get();

        foreach ($oneOffs as $a) {
            $out[] = self::rowFromOneOff($a, $userPhotoUrl);
        }

        $oneOffKeys = [];
        foreach ($oneOffs as $a) {
            $oneOffKeys[self::participantOccurrenceKey($a, $date->format('Y-m-d'))] = true;
        }

        $saturdays = self::getSaturdays($year, $month);
        $saturdayByNumber = [];
        foreach ($saturdays as $i => $d) {
            $saturdayByNumber[$i + 1] = $d;
        }

        $targetSaturday = null;
        foreach ($saturdayByNumber as $num => $d) {
            if ($d->isSameDay($date)) {
                $targetSaturday = $num;
                break;
            }
        }

        if ($targetSaturday === null) {
            return $out;
        }

        $computedDate = $saturdayByNumber[$targetSaturday] ?? null;
        if (! $computedDate) {
            return $out;
        }

        $dateKey = $computedDate->format('Y-m-d');

        $recurring = ScheduleAssignment::query()
            ->with(['user', 'volunteer.user', 'scheduleRole', 'ministry'])
            ->where('volunteer_id', $volunteerId)
            ->whereNull('schedule_date')
            ->where('saturday_number', $targetSaturday)
            ->where(function ($q) use ($month, $year) {
                $q->where('recurring', true)
                    ->orWhere(function ($q2) use ($month, $year) {
                        $q2->where('recurring', false)
                            ->where('assignment_month', $month)
                            ->where('assignment_year', $year);
                    });
            })
            ->get();

        foreach ($recurring as $a) {
            if (isset($oneOffKeys[self::participantOccurrenceKey($a, $dateKey)])) {
                continue;
            }

            if (ScheduleOccurrenceSkip::query()
                ->where('schedule_assignment_id', $a->id)
                ->whereDate('occurrence_date', $dateKey)
                ->exists()) {
                continue;
            }

            $override = ScheduleOccurrenceRoleOverride::query()
                ->where('schedule_assignment_id', $a->id)
                ->whereDate('occurrence_date', $dateKey)
                ->with('scheduleRole')
                ->first();

            $out[] = self::rowFromRecurring($a, $computedDate, $userPhotoUrl, $override);
        }

        return $out;
    }
}
