<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Event;
use App\Services\PublicationBroadcastNotifier;
use App\Support\EventFormSupport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

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
            'published_at' => $e->published_at?->toIso8601String(),
            'all_day' => $e->all_day,
            'location' => $e->location,
            'price' => $e->price,
            'purchase_url' => $e->purchase_url,
            'video_type' => $e->video_type,
            'video_url' => $e->video_url,
            'youtube_embed_url' => $e->youtube_embed_url,
            'image_url' => $e->image_url,
            'is_active' => (bool) $e->is_active,
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
        if ($data['published_at'] === null) {
            $data['published_at'] = now();
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('events.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        $event = Event::create(array_merge($data, [
            'church_id' => $churchId,
            'created_by' => $request->user()?->id,
        ]));

        $this->publicationBroadcast->notifyEvent($event, $request->user()?->id);

        return ListModalRedirect::toIndexEdit('events.index', $event, 'Evento criado com sucesso.');
    }

    public function update(Request $request, Event $event): RedirectResponse|JsonResponse
    {
        EventFormSupport::mergeEmptyOptionalRequestFields($request);

        $data = $request->validate(EventFormSupport::validationRules());
        EventFormSupport::normalizeValidatedPayload($data);

        $data['image_url'] = EventFormSupport::resolveImageUrl($request, $data, $event->image_url, 'events');
        unset($data['image_file']);
        if ($data['published_at'] === null) {
            $data['published_at'] = $event->published_at ?? now();
        }

        $event->update($data);

        return ListModalRedirect::toIndexEdit('events.index', $event->fresh() ?? $event, 'Evento atualizado com sucesso.');
    }

    public function destroy(Event $event)
    {
        $event->delete();

        return redirect()->route('events.index')->with('success', 'Evento removido com sucesso.');
    }

    public function setActive(Request $request, Event $event)
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $event->update(['is_active' => (bool) $data['is_active']]);

        return redirect()->route('events.index')->with(
            'success',
            $event->is_active ? 'Evento ativado com sucesso.' : 'Evento desativado com sucesso.'
        );
    }
}
