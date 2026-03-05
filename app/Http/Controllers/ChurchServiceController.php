<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChurchServiceController extends Controller
{
    public function index(Church $church): Response
    {
        $church->load('services');
        $services = $church->services->map(fn (ChurchService $s) => [
            'id' => $s->id,
            'day_of_week' => $s->day_of_week,
            'day_name' => ChurchService::dayName($s->day_of_week),
            'name' => $s->name,
            'start_time' => \Carbon\Carbon::parse($s->start_time)->format('H:i'),
            'end_time' => $s->end_time ? \Carbon\Carbon::parse($s->end_time)->format('H:i') : null,
            'sort_order' => $s->sort_order,
        ]);

        return Inertia::render('Churches/Services', [
            'church' => ['id' => $church->id, 'name' => $church->name],
            'services' => $services,
        ]);
    }

    public function store(Request $request, Church $church)
    {
        $data = $request->validate([
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'name' => ['required', 'string', 'max:255'],
            'start_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_time' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $church->services()->create([
            'day_of_week' => (int) $data['day_of_week'],
            'name' => $data['name'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ]);

        return redirect()->route('churches.services.index', $church)->with('success', 'Horário adicionado.');
    }

    public function update(Request $request, Church $church, ChurchService $service)
    {
        if ($service->church_id !== $church->id) {
            abort(404);
        }

        $data = $request->validate([
            'day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'name' => ['required', 'string', 'max:255'],
            'start_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'end_time' => ['nullable', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $service->update([
            'day_of_week' => (int) $data['day_of_week'],
            'name' => $data['name'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
        ]);

        return redirect()->route('churches.services.index', $church)->with('success', 'Horário atualizado.');
    }

    public function destroy(Church $church, ChurchService $service)
    {
        if ($service->church_id !== $church->id) {
            abort(404);
        }
        $service->delete();
        return redirect()->route('churches.services.index', $church)->with('success', 'Horário removido.');
    }
}
