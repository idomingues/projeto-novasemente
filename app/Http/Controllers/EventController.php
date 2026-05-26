<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use App\Support\EventFormSupport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    /** @return array<string, mixed> */
    private function serializeEvent(Event $e): array
    {
        return [
            'id' => $e->id,
            'title' => $e->title,
            'description' => $e->description,
            'starts_at' => $e->starts_at->toIso8601String(),
            'ends_at' => $e->ends_at?->toIso8601String(),
            'all_day' => $e->all_day,
            'location' => $e->location,
            'price' => $e->price,
            'purchase_url' => $e->purchase_url,
            'video_type' => $e->video_type,
            'video_url' => $e->video_url,
            'youtube_embed_url' => $e->youtube_embed_url,
            'image_url' => $e->image_url,
            'color' => $e->color,
        ];
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
            ->map(fn (Event $e) => $this->serializeEvent($e));

        $allEvents = (clone $query)->get()->map(fn (Event $e) => $this->serializeEvent($e));

        $user = $request->user();
        $canManage = $user && (
            $user->can('events.manage')
            || $user->hasRole('admin')
            || $user->hasRole('super_admin')
        );

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
        EventFormSupport::mergeEmptyOptionalRequestFields($request);

        $data = $request->validate(EventFormSupport::validationRules());
        EventFormSupport::normalizeValidatedPayload($data);

        $data['image_url'] = EventFormSupport::resolveImageUrl($request, $data, null, 'events');
        unset($data['image_file']);

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
        EventFormSupport::mergeEmptyOptionalRequestFields($request);

        $data = $request->validate(EventFormSupport::validationRules());
        EventFormSupport::normalizeValidatedPayload($data);

        $data['image_url'] = EventFormSupport::resolveImageUrl($request, $data, $event->image_url, 'events');
        unset($data['image_file']);

        $event->update($data);

        return redirect()->route('events.index')->with('success', 'Evento atualizado com sucesso.');
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return redirect()->route('events.index')->with('success', 'Evento removido com sucesso.');
    }
}
