<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Church;
use App\Models\ChurchService;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Services\YoutubePlaylistsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class VariosController extends Controller
{
    private function currentChurch(): ?Church
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return $church;
            }
        }
        return Church::where('active', true)->orderBy('name')->first();
    }

    private function getSaturdays(int $year, int $month): array
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

    public function schedule(Request $request): Response
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;

        if (! $request->user()) {
            return Inertia::render('Varios/Schedule', [
                'assignments' => [],
                'checkinEnabledDates' => [],
                'month' => $month,
                'year' => $year,
                'ministryId' => null,
                'ministries' => [],
                'canViewSchedule' => false,
            ]);
        }

        $churchId = Church::where('active', true)->orderBy('name')->value('id');

        $ministries = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get(['id', 'name']);
        $assignments = [];
        $checkinDates = [];

        if ($ministryId) {
            $startDate = Carbon::create($year, $month, 1);
            $endDate = $startDate->copy()->endOfMonth()->addDay();
            $baseQuery = ScheduleAssignment::query()
                ->with(['member', 'scheduleRole'])
                ->where('ministry_id', $ministryId);
            $oneOff = (clone $baseQuery)
                ->whereNotNull('schedule_date')
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->orderBy('schedule_date')
                ->get();
            $saturdays = $this->getSaturdays($year, $month);
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
            foreach ($oneOff as $a) {
                $assignments[] = [
                    'id' => $a->id,
                    'memberName' => $a->member->name,
                    'roleName' => $a->scheduleRole?->name,
                    'scheduleDate' => $a->schedule_date?->format('Y-m-d'),
                    'saturdayNumber' => $a->saturday_number,
                    'status' => $a->status,
                    'startTime' => $a->start_time,
                    'endTime' => $a->end_time,
                    'checkedInAt' => $a->checked_in_at?->toIso8601String(),
                ];
            }
            foreach ($recurring as $a) {
                $computedDate = $saturdayByNumber[$a->saturday_number] ?? null;
                if (!$computedDate) {
                    continue;
                }
                $assignments[] = [
                    'id' => $a->id,
                    'memberName' => $a->member->name,
                    'roleName' => $a->scheduleRole?->name,
                    'scheduleDate' => $computedDate->format('Y-m-d'),
                    'saturdayNumber' => $a->saturday_number,
                    'status' => $a->status,
                    'startTime' => $a->start_time,
                    'endTime' => $a->end_time,
                    'checkedInAt' => $a->checked_in_at?->toIso8601String(),
                ];
            }
            usort($assignments, fn ($x, $y) => strcmp($x['scheduleDate'] ?? '', $y['scheduleDate'] ?? ''));
            $checkinDates = ScheduleCheckinDate::query()
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->pluck('schedule_date')
                ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
                ->values()
                ->all();
        }

        return Inertia::render('Varios/Schedule', [
            'assignments' => $assignments,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries,
            'canViewSchedule' => true,
        ]);
    }

    public function services(): Response
    {
        $church = $this->currentChurch();
        $services = [];
        if ($church) {
            $services = $church->services()->get()->map(function ($s) {
                $start = Carbon::parse($s->start_time)->format('H:i');
                $end = $s->end_time ? Carbon::parse($s->end_time)->format('H:i') : null;
                return [
                    'id' => $s->id,
                    'day_of_week' => $s->day_of_week,
                    'day_name' => ChurchService::dayName($s->day_of_week),
                    'name' => $s->name,
                    'start_time' => $start,
                    'end_time' => $end,
                ];
            })->toArray();
        }

        return Inertia::render('Varios/Services', [
            'churchName' => $church?->name,
            'services' => $services,
        ]);
    }

    public function contact(): Response
    {
        $church = $this->currentChurch();
        $contact = null;
        if ($church) {
            $contact = [
                'name' => $church->name,
                'email' => $church->email,
                'phone' => $church->phone,
                'whatsapp' => $church->whatsapp,
                'address' => $church->address,
                'city' => $church->city,
                'state' => $church->state,
            ];
        }

        return Inertia::render('Varios/Contact', [
            'contact' => $contact,
        ]);
    }

    public function classeComecos(): Response
    {
        return Inertia::render('Varios/ClasseComecos', [
            'presencialUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLScBw6m09liDBLBGBJ52OwGGl0wegNxK6KpChq31w81cjuESZA/viewform',
            'onlineUrl' => 'https://docs.google.com/forms/d/e/1FAIpQLSeGNVPeTe9PYQ1w7gwN2ZPA4QN8J7LwqIJtV1iObtQqHvCdUw/viewform',
        ]);
    }

    public function acervo(): Response
    {
        $playlistsUrl = 'https://www.youtube.com/@advnovasemente/playlists';
        $playlists = YoutubePlaylistsService::fetch();

        return Inertia::render('Varios/Acervo', [
            'playlistsUrl' => $playlistsUrl,
            'playlists' => $playlists,
        ]);
    }

    public function notifications(Request $request): Response
    {
        $church = $this->currentChurch();
        $churchId = $church?->id;
        $notifications = AppNotification::recentForChurch($churchId);
        $canManage = $request->user()?->can('notifications.manage') ?? false;

        return Inertia::render('Varios/Notifications', [
            'notifications' => $notifications,
            'canManage' => $canManage,
        ]);
    }
}
