<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Models\ScheduleOccurrenceRoleOverride;
use App\Models\ScheduleOccurrenceSkip;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\ScheduleCheckinNotifier;
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

    private function memberPhotoPublicUrl(?Member $member): ?string
    {
        if (! $member || empty($member->photo_url)) {
            return null;
        }
        $u = $member->photo_url;
        if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) {
            return $u;
        }
        $base = request()->getSchemeAndHttpHost();

        return $base.(str_starts_with($u, '/') ? '' : '/').$u;
    }

    /** Funções definidas para o departamento (não há funções “globais” na escolha). */
    private function rolesForMinistry(int $ministryId): array
    {
        return ScheduleRole::query()
            ->where('ministry_id', $ministryId)
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id'])
            ->map(fn (ScheduleRole $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'ministryId' => $r->ministry_id,
            ])
            ->all();
    }

    private function roleMatchesMinistry(?int $roleId, int $ministryId): bool
    {
        if ($roleId === null) {
            return true;
        }
        $role = ScheduleRole::find($roleId);
        if (! $role) {
            return false;
        }

        return (int) $role->ministry_id === $ministryId;
    }

    public function index(Request $request): Response
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;
        $churchId = Church::where('active', true)->orderBy('name')->value('id');
        $user = $request->user();

        $ministriesQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name');

        if ($user && $user->hasRole('lider_ministerio') && !$user->hasRole('admin') && !$user->hasRole('super_admin')) {
            $leaderMinistryIds = $user->ministries()->pluck('ministries.id')->toArray();
            if (count($leaderMinistryIds) > 0) {
                $ministriesQuery->whereIn('id', $leaderMinistryIds);
            } else {
                $ministriesQuery->whereRaw('1 = 0');
            }
        }

        $ministries = $ministriesQuery->get(['id', 'name']);

        if ($user && $user->hasRole('lider_ministerio') && !$user->hasRole('admin') && !$user->hasRole('super_admin') && $ministries->count() === 1 && $ministryId === null) {
            $ministryId = $ministries->first()->id;
        }

        $assignments = [];
        $checkinDates = [];
        $volunteersForSelect = [];

        if ($ministryId) {
            $startDate = Carbon::create($year, $month, 1);
            $endDate = $startDate->copy()->endOfMonth()->addDay();

            $assignments = ScheduleAssignmentPresenter::monthAssignmentsForMinistry(
                $ministryId,
                $year,
                $month,
                fn ($m) => $this->memberPhotoPublicUrl($m)
            );

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

            $scheduleRoles = $this->rolesForMinistry($ministryId);
        } else {
            $scheduleRoles = [];
        }

        $canEdit = false;
        if ($user) {
            if ($user->hasRole('admin') || $user->hasRole('super_admin') || $user->can('escalas.manage')) {
                $canEdit = true;
            } elseif ($user->hasRole('lider_ministerio') && $ministryId) {
                $canEdit = $user->ministries()->where('ministries.id', $ministryId)->exists();
            }
        }

        return Inertia::render('Escalas/Index', [
            'assignments' => $assignments,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries,
            'canEdit' => $canEdit,
            'members' => $volunteersForSelect,
            'scheduleRoles' => $scheduleRoles,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
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

        if ($user && $user->hasRole('lider_ministerio') && !$user->hasRole('admin') && !$user->hasRole('super_admin')) {
            if (!$user->ministries()->where('ministries.id', $valid['ministry_id'])->exists()) {
                return back()->withErrors(['ministry_id' => 'Só pode adicionar escalas nos departamentos que gere.']);
            }
        }

        $hasSaturday = !empty($valid['saturday_number']);
        $hasDate = !empty($valid['schedule_date']);
        if ($hasSaturday === $hasDate) {
            return back()->withErrors(['saturday_number' => 'Informe saturday_number (recorrente) ou schedule_date (extra), mas não ambos.']);
        }

        if (! empty($valid['schedule_role_id']) && ! $this->roleMatchesMinistry((int) $valid['schedule_role_id'], (int) $valid['ministry_id'])) {
            return back()->withErrors(['schedule_role_id' => 'Esta função não é válida para este departamento.']);
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

    public function update(Request $request, ScheduleAssignment $assignment)
    {
        $user = $request->user();
        if ($user && $user->hasRole('lider_ministerio') && ! $user->hasRole('admin') && ! $user->hasRole('super_admin')) {
            if (! $user->ministries()->where('ministries.id', $assignment->ministry_id)->exists()) {
                return back()->withErrors(['assignment' => 'Sem permissão para esta escala.']);
            }
        }

        $valid = $request->validate([
            'schedule_role_id' => 'nullable|exists:schedule_roles,id',
            'scope' => 'nullable|in:series,occurrence',
            'occurrence_date' => 'nullable|date_format:Y-m-d',
        ]);

        $roleId = $valid['schedule_role_id'] !== null ? (int) $valid['schedule_role_id'] : null;
        if ($roleId !== null && ! $this->roleMatchesMinistry($roleId, (int) $assignment->ministry_id)) {
            return back()->withErrors(['schedule_role_id' => 'Função inválida para este departamento.']);
        }

        if ($assignment->schedule_date !== null) {
            $assignment->update(['schedule_role_id' => $roleId]);

            return back()->with('success', 'Função da escala atualizada.');
        }

        $isRecurringTemplate = $assignment->saturday_number !== null && $assignment->schedule_date === null;
        if (! $isRecurringTemplate) {
            $assignment->update(['schedule_role_id' => $roleId]);
            ScheduleOccurrenceRoleOverride::where('schedule_assignment_id', $assignment->id)->delete();

            return back()->with('success', 'Função da escala atualizada.');
        }

        $scope = $valid['scope'] ?? 'series';

        if ($scope === 'occurrence') {
            $occurrence = $valid['occurrence_date'] ?? null;
            if (! $occurrence) {
                return back()->withErrors(['occurrence_date' => 'Indique a data desta ocorrência.']);
            }
            if (! $this->occurrenceMatchesRecurringAssignment($assignment, $occurrence)) {
                return back()->withErrors(['occurrence_date' => 'Data inválida para esta escala.']);
            }

            $od = Carbon::parse($occurrence)->startOfDay();

            $existing = ScheduleAssignment::query()
                ->where('ministry_id', $assignment->ministry_id)
                ->where('member_id', $assignment->member_id)
                ->whereNotNull('schedule_date')
                ->whereDate('schedule_date', $od)
                ->first();

            if ($existing) {
                $existing->update(['schedule_role_id' => $roleId]);
            } else {
                ScheduleAssignment::create([
                    'ministry_id' => $assignment->ministry_id,
                    'member_id' => $assignment->member_id,
                    'schedule_role_id' => $roleId,
                    'saturday_number' => null,
                    'schedule_date' => $od->format('Y-m-d'),
                    'recurring' => false,
                    'assignment_month' => (int) $od->month,
                    'assignment_year' => (int) $od->year,
                    'status' => $assignment->status,
                ]);
            }

            ScheduleOccurrenceRoleOverride::query()
                ->where('schedule_assignment_id', $assignment->id)
                ->whereDate('occurrence_date', $od)
                ->delete();

            return back()->with('success', 'Função atualizada só para esta data.');
        }

        $assignment->update(['schedule_role_id' => $roleId]);
        ScheduleOccurrenceRoleOverride::where('schedule_assignment_id', $assignment->id)->delete();

        return back()->with('success', 'Função da escala atualizada.');
    }

    private function occurrenceMatchesRecurringAssignment(ScheduleAssignment $assignment, string $occurrenceYmd): bool
    {
        $od = Carbon::parse($occurrenceYmd)->startOfDay();
        $month = (int) $od->month;
        $year = (int) $od->year;
        $saturdays = ScheduleAssignmentPresenter::getSaturdays($year, $month);
        $expected = $saturdays[$assignment->saturday_number - 1] ?? null;

        return $expected !== null && $expected->isSameDay($od);
    }

    public function storeRole(Request $request)
    {
        $valid = $request->validate([
            'ministry_id' => 'required|exists:ministries,id',
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();
        if ($user && $user->hasRole('lider_ministerio') && ! $user->hasRole('admin') && ! $user->hasRole('super_admin')) {
            if (! $user->ministries()->where('ministries.id', $valid['ministry_id'])->exists()) {
                return back()->withErrors(['ministry_id' => 'Sem permissão para este departamento.']);
            }
        }

        ScheduleRole::create([
            'ministry_id' => $valid['ministry_id'],
            'name' => trim($valid['name']),
        ]);

        return back()->with('success', 'Função cadastrada.');
    }

    public function destroyRole(Request $request, ScheduleRole $scheduleRole)
    {
        if ($scheduleRole->ministry_id === null) {
            return back()->with('error', 'Funções gerais do sistema não podem ser removidas aqui.');
        }

        $user = $request->user();
        if ($user && $user->hasRole('lider_ministerio') && ! $user->hasRole('admin') && ! $user->hasRole('super_admin')) {
            if (! $user->ministries()->where('ministries.id', $scheduleRole->ministry_id)->exists()) {
                return back()->with('error', 'Sem permissão.');
            }
        }

        $scheduleRole->delete();

        return back()->with('success', 'Função removida.');
    }

    public function destroy(Request $request, ScheduleAssignment $assignment)
    {
        $user = $request->user();
        if ($user && $user->hasRole('lider_ministerio') && !$user->hasRole('admin') && !$user->hasRole('super_admin')) {
            if (!$user->ministries()->where('ministries.id', $assignment->ministry_id)->exists()) {
                return back()->with('error', 'Só pode remover escalas dos departamentos que gere.');
            }
        }

        $valid = $request->validate([
            'scope' => 'nullable|in:single,all',
            'occurrence_date' => 'nullable|date_format:Y-m-d',
        ]);

        $scope = $valid['scope'] ?? 'all';
        $recurringSeries = $assignment->recurring && $assignment->schedule_date === null && $assignment->saturday_number !== null;

        if ($scope === 'single' && $recurringSeries) {
            $occurrence = $valid['occurrence_date'] ?? null;
            if (! $occurrence) {
                return back()->withErrors(['occurrence_date' => 'Indique a data desta ocorrência.']);
            }
            if (! $this->occurrenceMatchesRecurringAssignment($assignment, $occurrence)) {
                return back()->withErrors(['occurrence_date' => 'Data inválida para esta escala.']);
            }

            ScheduleOccurrenceSkip::firstOrCreate([
                'schedule_assignment_id' => $assignment->id,
                'occurrence_date' => Carbon::parse($occurrence)->startOfDay(),
            ]);

            return back()->with('success', 'Esta data foi removida da escala (a série continua nos outros dias).');
        }

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
            app(ScheduleCheckinNotifier::class)->notifyForDate($date);
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
        $user = $request->user();

        if ($user && ! $this->userCanManageEscalas($user, $assignment) && (int) $assignment->member_id !== (int) ($user->member_id ?? 0)) {
            return back()->withErrors(['assignment_id' => 'Sem permissão para este check-in.']);
        }

        $date = $assignment->schedule_date
            ? Carbon::parse($assignment->schedule_date)
            : null;

        if (! $date && $assignment->saturday_number) {
            $now = now();
            $saturdays = $this->getSaturdays($now->year, $now->month);
            $idx = $assignment->saturday_number - 1;
            $date = $saturdays[$idx] ?? null;
        }

        if (! $date) {
            return back()->withErrors(['assignment_id' => 'Data da escala não encontrada.']);
        }

        $enabled = ScheduleCheckinDate::where('schedule_date', $date->copy()->startOfDay())->exists();
        if (! $enabled) {
            return back()->withErrors(['assignment_id' => 'Check-in não está habilitado para esta data.']);
        }

        $assignment->update(['checked_in_at' => now()]);

        return back()->with('success', 'Check-in realizado.');
    }

    private function userCanManageEscalas(User $user, ScheduleAssignment $assignment): bool
    {
        if ($user->hasRole('admin') || $user->hasRole('super_admin') || $user->can('escalas.manage')) {
            return true;
        }

        return $user->hasRole('lider_ministerio')
            && $user->ministries()->where('ministries.id', $assignment->ministry_id)->exists();
    }
}
