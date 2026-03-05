<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    /**
     * Sábados do mês (1-5).
     */
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

    private function formatDateKey($date): string
    {
        if ($date instanceof Carbon) {
            return $date->format('Y-m-d');
        }
        return Carbon::parse($date)->format('Y-m-d');
    }

    public function index(Request $request): Response
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;
        $churchId = Church::where('active', true)->orderBy('name')->value('id');

        $ministries = Ministry::query()
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId))
            ->orderBy('name')
            ->get(['id', 'name']);
        $assignments = [];
        $checkinDates = [];
        $volunteersForSelect = [];

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
                    'memberId' => $a->member_id,
                    'memberName' => $a->member->name,
                    'memberPhotoUrl' => null,
                    'roleId' => $a->schedule_role_id,
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
                    'memberId' => $a->member_id,
                    'memberName' => $a->member->name,
                    'memberPhotoUrl' => null,
                    'roleId' => $a->schedule_role_id,
                    'roleName' => $a->scheduleRole?->name,
                    'scheduleDate' => $computedDate->format('Y-m-d'),
                    'saturdayNumber' => $a->saturday_number,
                    'status' => $a->status,
                    'startTime' => $a->start_time,
                    'endTime' => $a->end_time,
                    'checkedInAt' => $a->checked_in_at?->toIso8601String(),
                ];
            }

            usort($assignments, function ($x, $y) {
                $dx = $x['scheduleDate'] ?? '';
                $dy = $y['scheduleDate'] ?? '';
                return strcmp($dx, $dy);
            });

            $checkinDates = ScheduleCheckinDate::query()
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->pluck('schedule_date')
                ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
                ->values()
                ->all();

            $volunteersForSelect = Volunteer::query()
                ->whereHas('ministries', fn ($q) => $q->where('ministries.id', $ministryId))
                ->where('active', true)
                ->whereNotNull('member_id')
                ->with('member')
                ->get()
                ->map(fn ($v) => ['id' => $v->member_id, 'name' => $v->member?->name ?? $v->name])
                ->unique('id')
                ->values()
                ->all();
        }

        $user = $request->user();
        $canEdit = $user && ($user->hasRole('admin') || $user->can('escalas.manage'));

        return Inertia::render('Escalas/Index', [
            'assignments' => $assignments,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries,
            'canEdit' => $canEdit,
            'members' => $volunteersForSelect,
        ]);
    }

    public function store(Request $request)
    {
        $valid = $request->validate([
            'ministry_id' => 'required|exists:ministries,id',
            'member_id' => 'required|exists:members,id',
            'schedule_role_id' => 'nullable|exists:schedule_roles,id',
            'saturday_number' => 'nullable|integer|min:1|max:5',
            'schedule_date' => 'nullable|date_format:Y-m-d',
            'recurring' => 'nullable|boolean',
            'assignment_month' => 'nullable|integer|min:1|max:12',
            'assignment_year' => 'nullable|integer|min:2020|max:2100',
            'status' => 'nullable|in:pending,confirmed,refused',
        ]);

        $hasSaturday = !empty($valid['saturday_number']);
        $hasDate = !empty($valid['schedule_date']);
        if ($hasSaturday === $hasDate) {
            return back()->withErrors(['saturday_number' => 'Informe saturday_number (recorrente) ou schedule_date (extra), mas não ambos.']);
        }

        $recurring = $hasSaturday ? (bool) ($valid['recurring'] ?? true) : true;
        $assignmentMonth = $recurring ? null : ($valid['assignment_month'] ?? null);
        $assignmentYear = $recurring ? null : ($valid['assignment_year'] ?? null);

        ScheduleAssignment::create([
            'ministry_id' => $valid['ministry_id'],
            'member_id' => $valid['member_id'],
            'schedule_role_id' => $valid['schedule_role_id'] ?? null,
            'saturday_number' => $hasSaturday ? $valid['saturday_number'] : null,
            'schedule_date' => $hasDate ? $valid['schedule_date'] : null,
            'recurring' => $recurring,
            'assignment_month' => $assignmentMonth,
            'assignment_year' => $assignmentYear,
            'status' => $valid['status'] ?? 'pending',
        ]);

        return back()->with('success', 'Escala adicionada.');
    }

    public function destroy(ScheduleAssignment $assignment)
    {
        $assignment->delete();
        return back()->with('success', 'Escala removida.');
    }

    public function checkinToggle(Request $request)
    {
        $valid = $request->validate([
            'schedule_date' => 'required|date_format:Y-m-d',
            'enabled' => 'required|boolean',
        ]);

        $date = Carbon::parse($valid['schedule_date'])->startOfDay();

        if ($valid['enabled']) {
            ScheduleCheckinDate::firstOrCreate(
                ['schedule_date' => $date],
                ['enabled_by' => $request->user()->id]
            );
        } else {
            ScheduleCheckinDate::where('schedule_date', $date)->delete();
            ScheduleAssignment::where('schedule_date', $date)->update(['checked_in_at' => null]);
            $saturdays = $this->getSaturdays($date->year, $date->month);
            $saturdayNumber = null;
            foreach ($saturdays as $i => $s) {
                if ($s->isSameDay($date)) {
                    $saturdayNumber = $i + 1;
                    break;
                }
            }
            if ($saturdayNumber !== null) {
                ScheduleAssignment::where('saturday_number', $saturdayNumber)
                    ->whereNull('schedule_date')
                    ->update(['checked_in_at' => null]);
            }
        }

        return back()->with('success', $valid['enabled'] ? 'Check-in habilitado.' : 'Check-in desabilitado.');
    }

    public function checkin(Request $request)
    {
        $valid = $request->validate([
            'assignment_id' => 'required|exists:schedule_assignments,id',
        ]);

        $assignment = ScheduleAssignment::findOrFail($valid['assignment_id']);
        $date = $assignment->schedule_date
            ? Carbon::parse($assignment->schedule_date)
            : null;

        if (!$date && $assignment->saturday_number) {
            $now = now();
            $saturdays = $this->getSaturdays($now->year, $now->month);
            $idx = $assignment->saturday_number - 1;
            $date = $saturdays[$idx] ?? null;
        }

        if (!$date) {
            return back()->withErrors(['assignment_id' => 'Data da escala não encontrada.']);
        }

        $enabled = ScheduleCheckinDate::where('schedule_date', $date->startOfDay())->exists();
        if (!$enabled) {
            return back()->withErrors(['assignment_id' => 'Check-in não está habilitado para esta data.']);
        }

        $assignment->update(['checked_in_at' => now()]);
        return back()->with('success', 'Check-in realizado.');
    }
}
