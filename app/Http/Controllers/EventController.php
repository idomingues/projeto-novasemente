<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EventController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
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
                'price' => $e->price,
                'purchase_url' => $e->purchase_url,
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
            'price' => $e->price,
            'purchase_url' => $e->purchase_url,
            'image_url' => $e->image_url,
            'color' => $e->color,
        ]);

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
        if ($request->input('ends_at') === '' || $request->input('ends_at') === null) {
            $request->merge(['ends_at' => null]);
        }
        $rawPurchaseIn = $request->input('purchase_url');
        if (! is_string($rawPurchaseIn) || trim($rawPurchaseIn) === '') {
            $request->merge(['purchase_url' => null]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'all_day' => ['boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'string', 'max:2000'],
            'purchase_url' => ['nullable', 'string', 'max:2048', 'url'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:4096'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $data['ends_at'] = $data['ends_at'] ?? null;
        $rawPrice = $data['price'] ?? null;
        $data['price'] = is_string($rawPrice) && trim($rawPrice) !== '' ? trim($rawPrice) : null;

        $rawPurchase = $data['purchase_url'] ?? null;
        $data['purchase_url'] = is_string($rawPurchase) && trim($rawPurchase) !== '' ? trim($rawPurchase) : null;

        $imageUrl = isset($data['image_url']) && trim((string) $data['image_url']) !== '' ? trim($data['image_url']) : null;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('events', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        }
        $data['image_url'] = $imageUrl;
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
        if ($request->input('ends_at') === '' || $request->input('ends_at') === null) {
            $request->merge(['ends_at' => null]);
        }
        $rawPurchaseIn = $request->input('purchase_url');
        if (! is_string($rawPurchaseIn) || trim($rawPurchaseIn) === '') {
            $request->merge(['purchase_url' => null]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'all_day' => ['boolean'],
            'location' => ['nullable', 'string', 'max:255'],
            'price' => ['nullable', 'string', 'max:2000'],
            'purchase_url' => ['nullable', 'string', 'max:2048', 'url'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:4096'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $data['ends_at'] = $data['ends_at'] ?? null;
        $rawPrice = $data['price'] ?? null;
        $data['price'] = is_string($rawPrice) && trim($rawPrice) !== '' ? trim($rawPrice) : null;

        $rawPurchase = $data['purchase_url'] ?? null;
        $data['purchase_url'] = is_string($rawPurchase) && trim($rawPurchase) !== '' ? trim($rawPurchase) : null;

        $imageUrl = isset($data['image_url']) && trim((string) $data['image_url']) !== '' ? trim($data['image_url']) : $event->image_url;
        if ($request->hasFile('image_file')) {
            $path = $request->file('image_file')->store('events', 'public');
            $imageUrl = StorageUrl::publicMediaUrl($path);
        }
        $data['image_url'] = $imageUrl;
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
