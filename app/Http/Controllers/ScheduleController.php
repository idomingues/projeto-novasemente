<?php

namespace App\Http\Controllers;

use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Models\ScheduleCoordinator;
use App\Models\ScheduleCoordinatorSkip;
use App\Models\ScheduleOccurrenceRoleOverride;
use App\Models\ScheduleOccurrenceSkip;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\ScheduleCheckinNotifier;
use App\Support\LeaderOperationalNotifications;
use App\Support\ScheduleBoardViewData;
use App\Support\ScheduleCoordinatorAccess;
use App\Support\UserMessagingPreferences;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleController extends Controller
{
    private function canManageMinistrySchedule(?User $user, int $ministryId): bool
    {
        return ScheduleCoordinatorAccess::canManageMinistrySchedule($user, $ministryId);
    }

    /**
     * @param  array<string, mixed>  $valid
     */
    private function slotContextFromPayload(array $valid): array
    {
        $year = (int) ($valid['view_year'] ?? $valid['assignment_year'] ?? now()->year);
        $month = (int) ($valid['view_month'] ?? $valid['assignment_month'] ?? now()->month);
        $scheduleDate = ! empty($valid['schedule_date']) ? (string) $valid['schedule_date'] : null;
        if ($scheduleDate) {
            $d = Carbon::parse($scheduleDate);
            $year = (int) $d->year;
            $month = (int) $d->month;
        }

        return [
            'year' => $year,
            'month' => $month,
            'saturday_number' => ! empty($valid['saturday_number']) ? (int) $valid['saturday_number'] : null,
            'schedule_date' => $scheduleDate,
        ];
    }

    private function canEditSlot(?User $user, int $ministryId, ?int $saturdayNumber, ?string $scheduleDate, int $year, int $month): bool
    {
        return ScheduleCoordinatorAccess::canEditDay($user, $ministryId, $saturdayNumber, $scheduleDate, $year, $month);
    }

    private function assignmentSlotContext(ScheduleAssignment $assignment, ?string $occurrenceDate = null): array
    {
        if ($occurrenceDate) {
            $d = Carbon::parse($occurrenceDate);

            return [
                'year' => (int) $d->year,
                'month' => (int) $d->month,
                'saturday_number' => $assignment->saturday_number !== null ? (int) $assignment->saturday_number : null,
                'schedule_date' => $assignment->saturday_number === null ? $d->format('Y-m-d') : null,
            ];
        }

        if ($assignment->schedule_date !== null) {
            $d = Carbon::parse($assignment->schedule_date);

            return [
                'year' => (int) $d->year,
                'month' => (int) $d->month,
                'saturday_number' => $assignment->saturday_number !== null ? (int) $assignment->saturday_number : null,
                'schedule_date' => $assignment->saturday_number === null ? $d->format('Y-m-d') : null,
            ];
        }

        $year = $assignment->assignment_year !== null ? (int) $assignment->assignment_year : (int) now()->year;
        $month = $assignment->assignment_month !== null ? (int) $assignment->assignment_month : (int) now()->month;

        return [
            'year' => $year,
            'month' => $month,
            'saturday_number' => $assignment->saturday_number !== null ? (int) $assignment->saturday_number : null,
            'schedule_date' => null,
        ];
    }

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
        return Inertia::render('Escalas/Index', ScheduleBoardViewData::forIndexRequest($request));
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $valid = $request->validate([
            'ministry_id' => 'required|exists:ministries,id',
            'member_id' => 'nullable|exists:users,id',
            'volunteer_id' => 'nullable|exists:volunteers,id',
            'schedule_role_id' => 'nullable|exists:schedule_roles,id',
            'saturday_number' => 'nullable|integer|min:1|max:5',
            'schedule_date' => 'nullable|date_format:Y-m-d',
            'recurring' => 'nullable|boolean',
            'assignment_month' => 'nullable|integer|min:1|max:12',
            'assignment_year' => 'nullable|integer|min:2020|max:2100',
            'view_month' => 'nullable|integer|min:1|max:12',
            'view_year' => 'nullable|integer|min:2020|max:2100',
            'status' => 'nullable|in:pending,confirmed,refused',
        ]);

        if (empty($valid['member_id']) && empty($valid['volunteer_id'])) {
            return back()->withErrors(['volunteer_id' => 'Escolha um voluntário para esta escala.']);
        }
        if (! empty($valid['member_id']) && ! empty($valid['volunteer_id'])) {
            return back()->withErrors(['volunteer_id' => 'Envie apenas volunteer_id ou o usuário (member_id).']);
        }

        $userId = null;
        $volunteerId = null;
        if (! empty($valid['volunteer_id'])) {
            $vol = Volunteer::query()->findOrFail((int) $valid['volunteer_id']);
            if (! $vol->ministries()->where('ministries.id', (int) $valid['ministry_id'])->exists()) {
                return back()->withErrors(['volunteer_id' => 'Este voluntário não está neste departamento.']);
            }
            if (! $vol->active) {
                return back()->withErrors(['volunteer_id' => 'Voluntário inativo.']);
            }
            $volunteerId = $vol->id;
            $userId = $vol->user_id;
        } else {
            $userId = (int) $valid['member_id'];
        }

        if (! $this->canManageMinistrySchedule($user, (int) $valid['ministry_id'])) {
            $slot = $this->slotContextFromPayload($valid);
            if (! $this->canEditSlot(
                $user,
                (int) $valid['ministry_id'],
                $slot['saturday_number'],
                $slot['schedule_date'],
                $slot['year'],
                $slot['month']
            )) {
                return back()->withErrors(['ministry_id' => 'Sem permissão para editar esta escala.']);
            }
        }

        $hasSaturday = ! empty($valid['saturday_number']);
        $hasDate = ! empty($valid['schedule_date']);
        if ($hasSaturday === $hasDate) {
            return back()->withErrors(['saturday_number' => 'Informe saturday_number (recorrente) ou schedule_date (extra), mas não ambos.']);
        }

        if (! empty($valid['schedule_role_id']) && ! $this->roleMatchesMinistry((int) $valid['schedule_role_id'], (int) $valid['ministry_id'])) {
            return back()->withErrors(['schedule_role_id' => 'Esta função não é válida para este departamento.']);
        }

        $recurring = $hasSaturday ? (bool) ($valid['recurring'] ?? true) : true;
        $assignmentMonth = $recurring ? null : ($valid['assignment_month'] ?? null);
        $assignmentYear = $recurring ? null : ($valid['assignment_year'] ?? null);

        if (
            $hasSaturday
            && $recurring
            && ! $this->canManageMinistrySchedule($user, (int) $valid['ministry_id'])
            && ! ScheduleCoordinatorAccess::coordinatesRecurringSaturday($user, (int) $valid['ministry_id'], (int) $valid['saturday_number'])
        ) {
            $slot = $this->slotContextFromPayload($valid);
            $recurring = false;
            $assignmentMonth = $slot['month'];
            $assignmentYear = $slot['year'];
        }

        ScheduleAssignment::create([
            'ministry_id' => $valid['ministry_id'],
            'user_id' => $userId,
            'volunteer_id' => $volunteerId,
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
        $valid = $request->validate([
            'schedule_role_id' => 'nullable|exists:schedule_roles,id',
            'scope' => 'nullable|in:series,occurrence',
            'occurrence_date' => 'nullable|date_format:Y-m-d',
        ]);

        $slot = $this->assignmentSlotContext($assignment, $valid['occurrence_date'] ?? null);
        if (! $this->canEditSlot(
            $user,
            (int) $assignment->ministry_id,
            $slot['saturday_number'],
            $slot['schedule_date'],
            $slot['year'],
            $slot['month']
        )) {
            return back()->withErrors(['assignment' => 'Sem permissão para esta escala.']);
        }

        $scope = $valid['scope'] ?? 'series';
        if (
            $scope === 'series'
            && $assignment->recurring
            && $assignment->schedule_date === null
            && ! $this->canManageMinistrySchedule($user, (int) $assignment->ministry_id)
            && ! ($assignment->saturday_number !== null
                && ScheduleCoordinatorAccess::coordinatesRecurringSaturday($user, (int) $assignment->ministry_id, (int) $assignment->saturday_number))
        ) {
            return back()->withErrors(['scope' => 'Sem permissão para alterar toda a série.']);
        }

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
                ->whereNotNull('schedule_date')
                ->whereDate('schedule_date', $od)
                ->where(function ($q) use ($assignment) {
                    if ($assignment->volunteer_id) {
                        $q->where('volunteer_id', $assignment->volunteer_id);
                    } else {
                        $q->where('user_id', $assignment->user_id);
                    }
                })
                ->first();

            if ($existing) {
                $existing->update(['schedule_role_id' => $roleId]);
            } else {
                ScheduleAssignment::create([
                    'ministry_id' => $assignment->ministry_id,
                    'user_id' => $assignment->user_id,
                    'volunteer_id' => $assignment->volunteer_id,
                    'schedule_role_id' => $roleId,
                    // Override de uma ocorrência da série: mantém o sábado-alvo.
                    'saturday_number' => $assignment->saturday_number,
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
        if (! $this->canManageMinistrySchedule($user, (int) $valid['ministry_id'])) {
            return back()->withErrors(['ministry_id' => 'Sem permissão para este departamento.']);
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
        if (! $this->canManageMinistrySchedule($user, (int) $scheduleRole->ministry_id)) {
            return back()->with('error', 'Sem permissão.');
        }

        $scheduleRole->delete();

        return back()->with('success', 'Função removida.');
    }

    public function destroy(Request $request, ScheduleAssignment $assignment)
    {
        $user = $request->user();
        $valid = $request->validate([
            'scope' => 'nullable|in:single,all',
            'occurrence_date' => 'nullable|date_format:Y-m-d',
        ]);

        $slot = $this->assignmentSlotContext($assignment, $valid['occurrence_date'] ?? null);
        if (! $this->canEditSlot(
            $user,
            (int) $assignment->ministry_id,
            $slot['saturday_number'],
            $slot['schedule_date'],
            $slot['year'],
            $slot['month']
        )) {
            return back()->with('error', 'Só pode remover escalas dos sábados que organiza.');
        }

        $scope = $valid['scope'] ?? 'all';
        $recurringSeries = $assignment->recurring && $assignment->schedule_date === null && $assignment->saturday_number !== null;

        if (
            $scope === 'all'
            && $recurringSeries
            && ! $this->canManageMinistrySchedule($user, (int) $assignment->ministry_id)
            && ! ScheduleCoordinatorAccess::coordinatesRecurringSaturday($user, (int) $assignment->ministry_id, (int) $assignment->saturday_number)
        ) {
            return back()->with('error', 'Sem permissão para remover toda a série.');
        }

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

    public function storeCoordinator(Request $request)
    {
        $user = $request->user();
        $valid = $request->validate([
            'ministry_id' => 'required|exists:ministries,id',
            'volunteer_id' => 'required|exists:volunteers,id',
            'saturday_number' => 'nullable|integer|min:1|max:5',
            'schedule_date' => 'nullable|date_format:Y-m-d',
            'recurring' => 'nullable|boolean',
            'assignment_month' => 'nullable|integer|min:1|max:12',
            'assignment_year' => 'nullable|integer|min:2020|max:2100',
            'view_month' => 'nullable|integer|min:1|max:12',
            'view_year' => 'nullable|integer|min:2020|max:2100',
        ]);

        if (! $this->canManageMinistrySchedule($user, (int) $valid['ministry_id'])) {
            return back()->withErrors(['ministry_id' => 'Sem permissão para definir o coordenador.']);
        }

        $vol = Volunteer::query()->findOrFail((int) $valid['volunteer_id']);
        if (! $vol->ministries()->where('ministries.id', (int) $valid['ministry_id'])->exists()) {
            return back()->withErrors(['volunteer_id' => 'Este voluntário não está neste departamento.']);
        }
        if (! $vol->active) {
            return back()->withErrors(['volunteer_id' => 'Voluntário inativo.']);
        }

        $hasSaturday = ! empty($valid['saturday_number']);
        $hasDate = ! empty($valid['schedule_date']);
        if ($hasSaturday === $hasDate) {
            return back()->withErrors(['saturday_number' => 'Informe o sábado ou a data extra, mas não ambos.']);
        }

        $recurring = $hasSaturday ? (bool) ($valid['recurring'] ?? true) : false;
        $assignmentMonth = $recurring ? null : ($valid['assignment_month'] ?? $valid['view_month'] ?? now()->month);
        $assignmentYear = $recurring ? null : ($valid['assignment_year'] ?? $valid['view_year'] ?? now()->year);
        $slot = $this->slotContextFromPayload($valid);

        $this->replaceCoordinatorForSlot(
            (int) $valid['ministry_id'],
            $hasSaturday ? (int) $valid['saturday_number'] : null,
            $hasDate ? (string) $valid['schedule_date'] : null,
            $recurring,
            (int) $slot['year'],
            (int) $slot['month']
        );

        ScheduleCoordinator::create([
            'ministry_id' => (int) $valid['ministry_id'],
            'volunteer_id' => $vol->id,
            'user_id' => $vol->user_id,
            'saturday_number' => $hasSaturday ? (int) $valid['saturday_number'] : null,
            'schedule_date' => $hasDate ? $valid['schedule_date'] : null,
            'recurring' => $recurring,
            'assignment_month' => $recurring ? null : $assignmentMonth,
            'assignment_year' => $recurring ? null : $assignmentYear,
        ]);

        return back()->with('success', 'Coordenador definido.');
    }

    public function destroyCoordinator(Request $request, ScheduleCoordinator $scheduleCoordinator)
    {
        $user = $request->user();
        if (! $this->canManageMinistrySchedule($user, (int) $scheduleCoordinator->ministry_id)) {
            return back()->with('error', 'Sem permissão para remover o coordenador.');
        }

        $valid = $request->validate([
            'scope' => 'nullable|in:single,all',
            'occurrence_date' => 'nullable|date_format:Y-m-d',
        ]);

        $scope = $valid['scope'] ?? 'all';
        $recurringSeries = $scheduleCoordinator->isRecurringSeries();

        if ($scope === 'single' && $recurringSeries) {
            $occurrence = $valid['occurrence_date'] ?? null;
            if (! $occurrence) {
                return back()->withErrors(['occurrence_date' => 'Indique a data desta ocorrência.']);
            }
            if (! ScheduleCoordinatorAccess::occurrenceMatchesRecurringCoordinator($scheduleCoordinator, $occurrence)) {
                return back()->withErrors(['occurrence_date' => 'Data inválida para este coordenador.']);
            }

            ScheduleCoordinatorSkip::firstOrCreate([
                'schedule_coordinator_id' => $scheduleCoordinator->id,
                'occurrence_date' => Carbon::parse($occurrence)->startOfDay(),
            ]);

            return back()->with('success', 'Coordenador removido só nesta data.');
        }

        $scheduleCoordinator->delete();

        return back()->with('success', 'Coordenador removido.');
    }

    private function replaceCoordinatorForSlot(
        int $ministryId,
        ?int $saturdayNumber,
        ?string $scheduleDate,
        bool $recurring,
        int $year,
        int $month
    ): void {
        if ($scheduleDate !== null) {
            ScheduleCoordinator::query()
                ->where('ministry_id', $ministryId)
                ->whereNull('saturday_number')
                ->whereDate('schedule_date', $scheduleDate)
                ->delete();

            return;
        }

        if ($saturdayNumber === null) {
            return;
        }

        $saturdays = ScheduleAssignmentPresenter::getSaturdays($year, $month);
        $occurrence = $saturdays[$saturdayNumber - 1] ?? null;
        $occurrenceYmd = $occurrence?->format('Y-m-d');

        $templates = ScheduleCoordinator::query()
            ->where('ministry_id', $ministryId)
            ->where('saturday_number', $saturdayNumber)
            ->whereNull('schedule_date')
            ->where(function ($q) use ($month, $year) {
                $q->where('recurring', true)
                    ->orWhere(function ($q2) use ($month, $year) {
                        $q2->where('recurring', false)
                            ->where('assignment_month', $month)
                            ->where('assignment_year', $year);
                    });
            })
            ->get();

        foreach ($templates as $existing) {
            if ($recurring) {
                $existing->delete();

                continue;
            }
            if ($existing->isRecurringSeries() && $occurrenceYmd) {
                ScheduleCoordinatorSkip::firstOrCreate([
                    'schedule_coordinator_id' => $existing->id,
                    'occurrence_date' => Carbon::parse($occurrenceYmd)->startOfDay(),
                ]);

                continue;
            }
            $existing->delete();
        }
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
            'schedule_date' => 'nullable|date_format:Y-m-d',
        ]);

        $assignment = ScheduleAssignment::findOrFail($valid['assignment_id']);
        $user = $request->user();

        $selfCheckin = false;
        if ($user && $assignment->user_id && (int) $assignment->user_id === (int) $user->id) {
            $selfCheckin = true;
        }
        $volProfile = $user?->volunteerProfile;
        if ($user && $assignment->volunteer_id && $volProfile && (int) $assignment->volunteer_id === (int) $volProfile->id) {
            $selfCheckin = true;
        }
        if ($user && ! $this->userCanManageEscalas($user, $assignment) && ! $selfCheckin) {
            return back()->withErrors(['assignment_id' => 'Sem permissão para este check-in.']);
        }

        $date = $assignment->schedule_date ? Carbon::parse($assignment->schedule_date) : null;

        if (! $date && ! empty($valid['schedule_date'])) {
            $date = Carbon::parse($valid['schedule_date']);
        }

        if ($date && $assignment->schedule_date && $date->format('Y-m-d') !== Carbon::parse($assignment->schedule_date)->format('Y-m-d')) {
            // Se a escala é "extra" (schedule_date preenchido), a data é fixa.
            $date = Carbon::parse($assignment->schedule_date);
        }

        if ($date && $assignment->saturday_number && $assignment->schedule_date === null) {
            // Escala recorrente por sábado do mês: a data informada precisa bater com o sábado da ocorrência.
            $saturdays = $this->getSaturdays($date->year, $date->month);
            $idx = $assignment->saturday_number - 1;
            $expected = $saturdays[$idx] ?? null;
            if (! $expected || ! $expected->isSameDay($date)) {
                return back()->withErrors(['assignment_id' => 'Data da escala inválida para este check-in.']);
            }
        }

        if (! $date) {
            return back()->withErrors(['assignment_id' => 'Data da escala não encontrada.']);
        }

        $enabled = ScheduleCheckinDate::where('schedule_date', $date->copy()->startOfDay())->exists();
        if (! $enabled) {
            return back()->withErrors(['assignment_id' => 'Check-in não está habilitado para esta data.']);
        }

        $actionUrl = route('escalas.index', [
            'month' => (int) $date->month,
            'year' => (int) $date->year,
            'ministry_id' => (int) $assignment->ministry_id,
        ], true);

        if ($assignment->checked_in_at) {
            $assignment->update(['checked_in_at' => null]);

            $this->notifyCheckinChange($request, $assignment, $date, false, $actionUrl);

            return back()->with('success', 'Check-in desfeito.');
        }

        $assignment->update(['checked_in_at' => now()]);

        $this->notifyCheckinChange($request, $assignment, $date, true, $actionUrl);

        return back()->with('success', 'Check-in realizado.');
    }

    private function notifyCheckinChange(Request $request, ScheduleAssignment $assignment, Carbon $date, bool $checkedIn, string $actionUrl): void
    {
        $actor = $request->user();
        $targetUserId = $assignment->user_id;
        if (! $targetUserId && $assignment->volunteer_id) {
            $targetUserId = Volunteer::query()->whereKey($assignment->volunteer_id)->value('user_id');
        }

        $targetUser = $targetUserId ? User::query()->find((int) $targetUserId) : null;
        $label = $date->translatedFormat('d/m/Y');
        $targetName = $targetUser?->name ?: ($assignment->volunteer?->display_name ?? 'Voluntário');
        $actorName = $actor?->name ?: 'Sistema';

        $title = $checkedIn ? 'Check-in realizado' : 'Check-in desfeito';

        // Só líderes do departamento da pessoa escalada (ninguém mais: admin, escalas.manage, etc.).
        $leaderIds = User::query()
            ->where(function ($q) {
                $q->where('is_ministry_leader', true);
            })
            ->whereHas('ministries', fn ($q) => $q->where('ministries.id', (int) $assignment->ministry_id))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if ($leaderIds === []) {
            return;
        }

        foreach (User::query()->whereIn('id', $leaderIds)->get(['id', 'name', 'notify_via_app', 'is_ministry_leader']) as $u) {
            if ($actor && (int) $u->id === (int) $actor->id) {
                continue;
            }
            if (! LeaderOperationalNotifications::userShouldReceive($u)) {
                continue;
            }
            if (! UserMessagingPreferences::acceptsInbox($u)) {
                continue;
            }
            $body = $checkedIn
                ? $targetName.' teve check-in marcado em '.$label.' (por '.$actorName.').'
                : $targetName.' teve check-in desfeito em '.$label.' (por '.$actorName.').';
            UserInboxNotification::create([
                'user_id' => $u->id,
                'title' => $title,
                'body' => $body,
                'intent' => UserInboxNotification::INTENT_INFO,
                'action_url' => $actionUrl,
            ]);
        }
    }

    private function userCanManageEscalas(User $user, ScheduleAssignment $assignment): bool
    {
        $slot = $this->assignmentSlotContext($assignment);

        return $this->canEditSlot(
            $user,
            (int) $assignment->ministry_id,
            $slot['saturday_number'],
            $slot['schedule_date'],
            $slot['year'],
            $slot['month']
        );
    }
}
