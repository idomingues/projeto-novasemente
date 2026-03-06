<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Http\Requests\StoreMinistryRequest;
use App\Http\Requests\UpdateMinistryRequest;
use Inertia\Inertia;
use Inertia\Response;

class MinistryController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(): Response
    {
        $churchId = $this->currentChurchId();
        $departments = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get();

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
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
