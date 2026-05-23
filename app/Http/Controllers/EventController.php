<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Event;
use App\Models\Musica;
use App\Support\InstagramUrl;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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

    /** @param  array<string, mixed>  $data */
    private function normalizeVideoFields(array &$data): void
    {
        $type = trim((string) ($data['video_type'] ?? ''));
        if ($type === '') {
            $data['video_type'] = null;
            $data['video_url'] = null;

            return;
        }

        $url = trim((string) ($data['video_url'] ?? ''));
        if ($url === '') {
            throw ValidationException::withMessages([
                'video_url' => $type === Event::VIDEO_YOUTUBE
                    ? 'Informe o link do vídeo no YouTube.'
                    : 'Informe o link da publicação no Instagram.',
            ]);
        }

        if ($type === Event::VIDEO_YOUTUBE) {
            if (Musica::youtubeVideoId($url) === null) {
                throw ValidationException::withMessages([
                    'video_url' => 'Link do YouTube inválido.',
                ]);
            }
            $data['video_url'] = $url;
            $data['video_type'] = Event::VIDEO_YOUTUBE;

            return;
        }

        if ($type === Event::VIDEO_INSTAGRAM) {
            $normalized = InstagramUrl::normalize($url);
            if ($normalized === null) {
                throw ValidationException::withMessages([
                    'video_url' => 'Link do Instagram inválido. Use um link de post, reel ou IGTV.',
                ]);
            }
            $data['video_url'] = $normalized;
            $data['video_type'] = Event::VIDEO_INSTAGRAM;

            return;
        }

        throw ValidationException::withMessages([
            'video_type' => 'Tipo de vídeo inválido.',
        ]);
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
        if ($request->input('ends_at') === '' || $request->input('ends_at') === null) {
            $request->merge(['ends_at' => null]);
        }
        $rawPurchaseIn = $request->input('purchase_url');
        if (! is_string($rawPurchaseIn) || trim($rawPurchaseIn) === '') {
            $request->merge(['purchase_url' => null]);
        }
        $rawVideoType = $request->input('video_type');
        if (! is_string($rawVideoType) || trim($rawVideoType) === '') {
            $request->merge(['video_type' => null, 'video_url' => null]);
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
            'video_type' => ['nullable', 'string', Rule::in([Event::VIDEO_YOUTUBE, Event::VIDEO_INSTAGRAM])],
            'video_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:4096'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $data['ends_at'] = $data['ends_at'] ?? null;
        $rawPrice = $data['price'] ?? null;
        $data['price'] = is_string($rawPrice) && trim($rawPrice) !== '' ? trim($rawPrice) : null;

        $rawPurchase = $data['purchase_url'] ?? null;
        $data['purchase_url'] = is_string($rawPurchase) && trim($rawPurchase) !== '' ? trim($rawPurchase) : null;

        $this->normalizeVideoFields($data);

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
        $rawVideoType = $request->input('video_type');
        if (! is_string($rawVideoType) || trim($rawVideoType) === '') {
            $request->merge(['video_type' => null, 'video_url' => null]);
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
            'video_type' => ['nullable', 'string', Rule::in([Event::VIDEO_YOUTUBE, Event::VIDEO_INSTAGRAM])],
            'video_url' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:1024'],
            'image_file' => ['nullable', 'image', 'max:4096'],
            'color' => ['nullable', 'string', 'max:50'],
        ]);

        $data['ends_at'] = $data['ends_at'] ?? null;
        $rawPrice = $data['price'] ?? null;
        $data['price'] = is_string($rawPrice) && trim($rawPrice) !== '' ? trim($rawPrice) : null;

        $rawPurchase = $data['purchase_url'] ?? null;
        $data['purchase_url'] = is_string($rawPurchase) && trim($rawPurchase) !== '' ? trim($rawPurchase) : null;

        $this->normalizeVideoFields($data);

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
