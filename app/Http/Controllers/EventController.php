<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        $query = Event::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('starts_at');

        $startOfMonth = \Carbon\Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = $startOfMonth->copy()->endOfMonth()->endOfDay();

        $eventsForMonth = (clone $query)
            ->whereBetween('starts_at', [$startOfMonth, $endOfMonth])
            ->get()
            ->map(fn (Event $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'description' => $e->description,
                'starts_at' => $e->starts_at->toIso8601String(),
                'ends_at' => $e->ends_at?->toIso8601String(),
                'all_day' => $e->all_day,
                'location' => $e->location,
                'image_url' => $e->image_url,
                'color' => $e->color,
            ]);

        $allEvents = (clone $query)->get()->map(fn (Event $e) => [
            'id' => $e->id,
            'title' => $e->title,
            'description' => $e->description,
            'starts_at' => $e->starts_at->toIso8601String(),
            'ends_at' => $e->ends_at?->toIso8601String(),
            'all_day' => $e->all_day,
            'location' => $e->location,
            'image_url' => $e->image_url,
            'color' => $e->color,
        ]);

        $user = $request->user();
        $canManage = $user
            && ($user->hasRole('admin')
                || $user->hasRole('super_admin')
                || $user->can('events.manage'));

        return Inertia::render('Events/Index', [
            'events' => $allEvents,
            'eventsForMonth' => $eventsForMonth,
            'month' => $month,
            'year' => $year,
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'all_day' => ['boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('events.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        Event::create(array_merge($data, [
            'church_id' => $churchId,
            'created_by' => $request->user()?->id,
        ]));

        return redirect()->route('events.index')->with('success', 'Evento criado com sucesso.');
    }

    public function update(Request $request, Event $event)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'all_day' => ['boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $event->update($data);

        return redirect()->route('events.index')->with('success', 'Evento atualizado com sucesso.');
    }

    public function destroy(Event $event)
    {
        $event->delete();
        return redirect()->route('events.index')->with('success', 'Evento removido com sucesso.');
    }
}
