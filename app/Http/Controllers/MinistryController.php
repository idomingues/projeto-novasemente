<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMinistryRequest;
use App\Http\Requests\UpdateMinistryRequest;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleRole;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MinistryController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $departments = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get();

        $scheduleRoles = ScheduleRole::query()
            ->whereIn('ministry_id', $departments->pluck('id'))
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id']);

        $scheduleRolesByDepartmentId = $scheduleRoles
            ->groupBy('ministry_id')
            ->map(fn ($rows) => $rows->map(fn (ScheduleRole $r) => ['id' => $r->id, 'name' => $r->name])->values()->all())
            ->toArray();

        $canManageEscalasRoles = $request->user()?->can('escalas.manage') ?? false;

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
            'scheduleRolesByDepartmentId' => $scheduleRolesByDepartmentId,
            'canManageEscalasRoles' => $canManageEscalasRoles,
        ]);
    }

    public function store(StoreMinistryRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('departments.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        Ministry::create(array_merge($request->validated(), [
            'church_id' => $churchId,
        ]));

        return redirect()->route('departments.index')->with('success', 'Departamento criado com sucesso!');
    }

    public function update(UpdateMinistryRequest $request, Ministry $ministry)
    {
        $ministry->update($request->validated());

        return redirect()->route('departments.index')->with('success', 'Departamento atualizado com sucesso!');
    }

    public function destroy(Ministry $ministry)
    {
        $ministry->delete();

        return redirect()->route('departments.index')->with('success', 'Departamento removido com sucesso!');
    }
}
