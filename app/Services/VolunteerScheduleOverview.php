<?php

namespace App\Services;

use App\Models\Member;
use App\Models\ScheduleCheckinDate;
use App\Models\Volunteer;
use Carbon\Carbon;

class VolunteerScheduleOverview
{
    /**
     * @param  callable(Member|null): ?string  $memberPhotoUrl
     * @return array{events: array<int, array<string, mixed>>, departments: array<int, array{id: int, name: string}>, hasVolunteerProfile: bool}
     */
    public static function forMember(int $memberId, int $year, int $month, callable $memberPhotoUrl): array
    {
        $volunteer = Volunteer::query()
            ->where('member_id', $memberId)
            ->where('active', true)
            ->first();

        if (! $volunteer) {
            return [
                'events' => [],
                'departments' => [],
                'hasVolunteerProfile' => false,
            ];
        }

        $departments = $volunteer->ministries()
            ->orderBy('name')
            ->get(['ministries.id', 'ministries.name'])
            ->map(fn ($m) => ['id' => $m->id, 'name' => $m->name])
            ->values()
            ->all();

        $startDate = Carbon::create($year, $month, 1);
        $endDate = $startDate->copy()->endOfMonth()->addDay();

        $checkinYmd = ScheduleCheckinDate::query()
            ->where('schedule_date', '>=', $startDate)
            ->where('schedule_date', '<', $endDate)
            ->pluck('schedule_date')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
            ->all();
        $checkinSet = array_flip($checkinYmd);

        $events = [];

        foreach ($volunteer->ministries()->orderBy('name')->get() as $ministry) {
            $rows = ScheduleAssignmentPresenter::monthAssignmentsForMinistry(
                (int) $ministry->id,
                $year,
                $month,
                $memberPhotoUrl
            );

            $byDate = [];
            foreach ($rows as $r) {
                $dk = $r['scheduleDate'] ?? '';
                if ($dk === '') {
                    continue;
                }
                $byDate[$dk][] = $r;
            }

            foreach ($byDate as $dateKey => $group) {
                $mine = collect($group)->first(function ($row) use ($memberId, $volunteer) {
                    if ((int) ($row['memberId'] ?? 0) === $memberId) {
                        return true;
                    }

                    return isset($row['volunteerId']) && (int) $row['volunteerId'] === (int) $volunteer->id;
                });
                if (! $mine) {
                    continue;
                }

                $teammates = [];
                foreach ($group as $r) {
                    $teammates[] = [
                        'assignmentId' => $r['id'],
                        'memberId' => $r['memberId'] ?? null,
                        'volunteerId' => $r['volunteerId'] ?? null,
                        'memberName' => $r['memberName'],
                        'memberPhotoUrl' => $r['memberPhotoUrl'],
                        'roleName' => $r['roleName'],
                        'checkedInAt' => $r['checkedInAt'],
                        'isMe' => (int) ($r['memberId'] ?? 0) === $memberId
                            || (isset($r['volunteerId']) && (int) $r['volunteerId'] === (int) $volunteer->id),
                    ];
                }
                usort($teammates, fn ($a, $b) => strcmp($a['memberName'], $b['memberName']));

                $events[] = [
                    'dateYmd' => $dateKey,
                    'ministryId' => (int) $ministry->id,
                    'ministryName' => $ministry->name,
                    'myAssignmentId' => (int) $mine['id'],
                    'myRoleName' => $mine['roleName'],
                    'checkinEnabled' => isset($checkinSet[$dateKey]),
                    'teammates' => $teammates,
                ];
            }
        }

        usort($events, fn ($a, $b) => strcmp($a['dateYmd'], $b['dateYmd']));

        return [
            'events' => $events,
            'departments' => $departments,
            'hasVolunteerProfile' => true,
        ];
    }
}
