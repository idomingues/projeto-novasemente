<?php

namespace App\Services;

use App\Models\ScheduleAssignment;
use App\Models\ScheduleOccurrenceRoleOverride;
use App\Models\ScheduleOccurrenceSkip;
use Carbon\Carbon;
class ScheduleAssignmentPresenter
{
    /**
     * @param  callable(\App\Models\Member|null): ?string  $memberPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function monthAssignmentsForMinistry(
        int $ministryId,
        int $year,
        int $month,
        callable $memberPhotoUrl
    ): array {
        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth()->addDay();

        $baseQuery = ScheduleAssignment::query()
            ->with(['member', 'scheduleRole', 'ministry'])
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
            $assignments[] = self::rowFromOneOff($a, $memberPhotoUrl);
        }

        $oneOffKeys = [];
        foreach ($oneOff as $a) {
            $dk = $a->schedule_date?->format('Y-m-d');
            if ($dk !== null) {
                $oneOffKeys[$a->member_id.'|'.$a->ministry_id.'|'.$dk] = true;
            }
        }

        foreach ($recurring as $a) {
            $computedDate = $saturdayByNumber[$a->saturday_number] ?? null;
            if (! $computedDate) {
                continue;
            }
            $dateKey = $computedDate->format('Y-m-d');
            if (isset($oneOffKeys[$a->member_id.'|'.$a->ministry_id.'|'.$dateKey])) {
                continue;
            }
            $skipDates = $skipsByAssignment->get($a->id, collect())->map(fn ($s) => $s->occurrence_date->format('Y-m-d'));
            if ($skipDates->contains($dateKey)) {
                continue;
            }
            $override = $overrides->get($a->id.'|'.$dateKey);
            $assignments[] = self::rowFromRecurring($a, $computedDate, $memberPhotoUrl, $override);
        }

        usort($assignments, fn ($x, $y) => strcmp($x['scheduleDate'] ?? '', $y['scheduleDate'] ?? ''));

        return $assignments;
    }

    /**
     * @param  callable(\App\Models\Member|null): ?string  $memberPhotoUrl
     * @return array<string, mixed>
     */
    public static function rowFromOneOff(ScheduleAssignment $a, callable $memberPhotoUrl): array
    {
        return [
            'id' => $a->id,
            'memberId' => $a->member_id,
            'memberName' => $a->member->name,
            'memberPhotoUrl' => $memberPhotoUrl($a->member),
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
        ];
    }

    /**
     * @param  callable(\App\Models\Member|null): ?string  $memberPhotoUrl
     * @return array<string, mixed>
     */
    public static function rowFromRecurring(
        ScheduleAssignment $a,
        Carbon $computedDate,
        callable $memberPhotoUrl,
        ?ScheduleOccurrenceRoleOverride $override = null
    ): array {
        $roleId = $override ? $override->schedule_role_id : $a->schedule_role_id;
        $roleName = $override
            ? ($override->schedule_role_id === null ? null : $override->scheduleRole?->name)
            : $a->scheduleRole?->name;

        $recurringSeries = $a->recurring && $a->saturday_number !== null && $a->schedule_date === null;

        return [
            'id' => $a->id,
            'memberId' => $a->member_id,
            'memberName' => $a->member->name,
            'memberPhotoUrl' => $memberPhotoUrl($a->member),
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
        ];
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
     * Todas as linhas de escala de um membro numa data (vários departamentos).
     *
     * @param  callable(\App\Models\Member|null): ?string  $memberPhotoUrl
     * @return array<int, array<string, mixed>>
     */
    public static function assignmentsForMemberOnDate(
        int $memberId,
        string $dateYmd,
        callable $memberPhotoUrl
    ): array {
        $date = Carbon::parse($dateYmd)->startOfDay();
        $month = (int) $date->month;
        $year = (int) $date->year;
        $out = [];

        $oneOffs = ScheduleAssignment::query()
            ->with(['member', 'scheduleRole', 'ministry'])
            ->where('member_id', $memberId)
            ->whereDate('schedule_date', $date)
            ->get();

        foreach ($oneOffs as $a) {
            $out[] = self::rowFromOneOff($a, $memberPhotoUrl);
        }

        $oneOffKeys = [];
        foreach ($oneOffs as $a) {
            $oneOffKeys[$a->member_id.'|'.$a->ministry_id.'|'.$date->format('Y-m-d')] = true;
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
            ->with(['member', 'scheduleRole', 'ministry'])
            ->where('member_id', $memberId)
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
            if (isset($oneOffKeys[$a->member_id.'|'.$a->ministry_id.'|'.$dateKey])) {
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

            $out[] = self::rowFromRecurring($a, $computedDate, $memberPhotoUrl, $override);
        }

        return $out;
    }
}
