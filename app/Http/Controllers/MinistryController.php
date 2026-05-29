<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMinistryRequest;
use App\Http\Requests\UpdateMinistryRequest;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\SearchTerm;
use App\Support\VolunteerChurchRosterBuilder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MinistryController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    /**
     * @return array<int, int>
     */
    private function validLeaderUserIds(?int $churchId, array $ids): array
    {
        if ($churchId === null || $ids === []) {
            return [];
        }

        return User::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function validVolunteerIds(?int $churchId, array $ids): array
    {
        if ($churchId === null || $ids === []) {
            return [];
        }

        return VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $search = trim((string) $request->input('search', ''));

        $departmentsQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->with([
                'users:id,name,email',
                'volunteers:id,name,email',
            ])
            ->orderBy('name');

        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($departmentsQuery, ['name'], $search);
        }

        $departments = $departmentsQuery->get();

        $scheduleRoles = ScheduleRole::query()
            ->whereIn('ministry_id', $departments->pluck('id'))
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id']);

        $scheduleRolesByDepartmentId = $scheduleRoles
            ->groupBy('ministry_id')
            ->map(fn ($rows) => $rows->map(fn (ScheduleRole $r) => ['id' => $r->id, 'name' => $r->name])->values()->all())
            ->toArray();

        $leaderOptions = [];
        $volunteerOptions = [];
        if ($churchId !== null) {
            $leaderOptions = User::query()
                ->where('church_id', $churchId)
                ->with('volunteerProfile:id,user_id')
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $u) => [
                    'id' => (int) $u->id,
                    'name' => (string) $u->name,
                    'email' => $u->email,
                    'volunteer_id' => $u->volunteerProfile?->id ? (int) $u->volunteerProfile->id : null,
                ])
                ->values()
                ->all();

            $volunteerOptions = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (Volunteer $v) => [
                    'id' => (int) $v->id,
                    'name' => (string) ($v->name ?: 'Sem nome'),
                    'email' => $v->email,
                ])
                ->values()
                ->all();
        }

        $canManageEscalasRoles = $request->user()?->can('escalas.manage') ?? false;
        $canManage = $request->user()?->can('departments.manage') ?? false;
        $canViewVolunteerDetail = ($request->user()?->can('volunteers.view') ?? false)
            || ($request->user()?->can('volunteers.manage') ?? false);

        return Inertia::render('Departments/Index', [
            'departments' => $departments->map(fn (Ministry $m) => [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'icon' => $m->icon,
                'leaders' => $m->users->map(fn (User $u) => [
                    'id' => (int) $u->id,
                    'name' => (string) $u->name,
                    'addedAt' => $u->pivot->created_at?->toIso8601String(),
                ])->values()->all(),
                'volunteers' => $m->volunteers->map(fn (Volunteer $v) => [
                    'id' => (int) $v->id,
                    'name' => (string) ($v->name ?: 'Sem nome'),
                    'addedAt' => $v->pivot->created_at?->toIso8601String(),
                ])->values()->all(),
            ])->values()->all(),
            'scheduleRolesByDepartmentId' => $scheduleRolesByDepartmentId,
            'leaderOptions' => $leaderOptions,
            'volunteerOptions' => $volunteerOptions,
            'canManageEscalasRoles' => $canManageEscalasRoles,
            'canManage' => $canManage,
            'volunteerDetailUrlPattern' => $canViewVolunteerDetail
                ? route('volunteers.detail', ['volunteer' => 0])
                : null,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreMinistryRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('departments.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        $ministry = Ministry::create(array_merge($request->validated(), [
            'church_id' => $churchId,
        ]));

        return redirect()
            ->route('departments.index', ['modal' => 'edit', 'id' => $ministry->id])
            ->with('success', 'Departamento criado com sucesso!');
    }

    public function update(UpdateMinistryRequest $request, Ministry $ministry)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $ministry->church_id !== (int) $churchId) {
            abort(404);
        }

        $ministry->update($request->safe()->only(['name', 'icon']));

        if ($request->has('leader_user_ids')) {
            $leaderIds = $this->validLeaderUserIds($churchId, array_map('intval', (array) $request->input('leader_user_ids', [])));
            if (count($leaderIds) !== count(array_unique(array_map('intval', (array) $request->input('leader_user_ids', []))))) {
                throw ValidationException::withMessages([
                    'leader_user_ids' => 'Um ou mais líderes não pertencem a esta igreja.',
                ]);
            }
            $ministry->users()->sync($leaderIds);
        }

        if ($request->has('volunteer_ids')) {
            $volunteerIds = $this->validVolunteerIds($churchId, array_map('intval', (array) $request->input('volunteer_ids', [])));
            $requested = array_unique(array_map('intval', (array) $request->input('volunteer_ids', [])));
            if (count($volunteerIds) !== count($requested)) {
                throw ValidationException::withMessages([
                    'volunteer_ids' => 'Um ou mais voluntários não são válidos nesta igreja.',
                ]);
            }
            $ministry->volunteers()->sync($volunteerIds);
        }

        return redirect()->route('departments.index')->with('success', 'Departamento atualizado com sucesso!');
    }

    public function destroy(Ministry $ministry)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $ministry->church_id !== (int) $churchId) {
            abort(404);
        }

        $ministry->delete();

        return redirect()->route('departments.index')->with('success', 'Departamento removido com sucesso!');
    }
}
