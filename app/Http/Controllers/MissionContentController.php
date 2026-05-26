<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\MissionAboutSection;
use App\Models\MissionEvent;
use App\Models\MissionMessage;
use App\Models\MissionWallItem;
use App\Models\PhotoAlbum;
use App\Services\DriveFolderCoverService;
use App\Support\EventFormSupport;
use App\Support\MissionAboutBootstrap;
use App\Support\StorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MissionContentController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canView(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('mission.view') || $u->can('mission.manage'), 403);
    }

    private function canManage(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('mission.manage'), 403);
    }

    /** @return array<string, mixed> */
    private function serializeMissionEvent(MissionEvent $e): array
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

    public function eventsIndex(Request $request): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $events = MissionEvent::query()
            ->where('church_id', $churchId)
            ->orderBy('starts_at')
            ->get()
            ->map(fn (MissionEvent $e) => $this->serializeMissionEvent($e));

        return Inertia::render('Mission/Events', [
            'events' => $events,
            'canManage' => $request->user()?->can('mission.manage') ?? false,
        ]);
    }

    public function storeEvent(Request $request): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        EventFormSupport::mergeEmptyOptionalRequestFields($request);

        $data = $request->validate(EventFormSupport::validationRules());
        EventFormSupport::normalizeValidatedPayload($data);

        $data['image_url'] = EventFormSupport::resolveImageUrl($request, $data, null, 'mission/events');
        unset($data['image_file']);

        MissionEvent::create(array_merge($data, [
            'church_id' => $churchId,
            'created_by' => $request->user()?->id,
        ]));

        return redirect()->route('mission.content.events')->with('success', 'Evento criado com sucesso.');
    }

    public function updateEvent(Request $request, MissionEvent $missionEvent): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionEvent->church_id === (int) $churchId, 404);

        EventFormSupport::mergeEmptyOptionalRequestFields($request);

        $data = $request->validate(EventFormSupport::validationRules());
        EventFormSupport::normalizeValidatedPayload($data);

        $data['image_url'] = EventFormSupport::resolveImageUrl($request, $data, $missionEvent->image_url, 'mission/events');
        unset($data['image_file']);

        $missionEvent->update($data);

        return redirect()->route('mission.content.events')->with('success', 'Evento atualizado com sucesso.');
    }

    public function destroyEvent(Request $request, MissionEvent $missionEvent): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionEvent->church_id === (int) $churchId, 404);

        $missionEvent->delete();

        return redirect()->route('mission.content.events')->with('success', 'Evento removido com sucesso.');
    }

    public function messagesIndex(Request $request): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $messages = MissionMessage::query()
            ->with('user:id,name,email')
            ->where('church_id', $churchId)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (MissionMessage $m) => [
                'id' => $m->id,
                'body' => $m->body,
                'authorName' => $m->user?->name ?? '—',
                'authorEmail' => $m->user?->email,
                'is_hidden' => $m->is_hidden,
                'createdAt' => $m->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Mission/Messages', [
            'messages' => $messages,
            'canManage' => $request->user()?->can('mission.manage') ?? false,
        ]);
    }

    public function toggleMessageVisibility(Request $request, MissionMessage $missionMessage): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionMessage->church_id === (int) $churchId, 404);

        $missionMessage->update(['is_hidden' => ! $missionMessage->is_hidden]);

        return back()->with('success', $missionMessage->is_hidden ? 'Recado ocultado.' : 'Recado visível novamente.');
    }

    public function destroyMessage(Request $request, MissionMessage $missionMessage): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionMessage->church_id === (int) $churchId, 404);

        $missionMessage->delete();

        return back()->with('success', 'Recado excluído.');
    }

    public function aboutIndex(Request $request): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $sections = MissionAboutBootstrap::sectionsForChurch((int) $churchId);

        $blocks = collect(MissionAboutSection::DEFAULT_TITLES)
            ->keys()
            ->map(fn (string $key) => [
                'key' => $key,
                'title' => $sections[$key]->title,
                'body' => $sections[$key]->body ?? '',
            ])
            ->values()
            ->all();

        return Inertia::render('Mission/About', [
            'blocks' => $blocks,
            'canManage' => $request->user()?->can('mission.manage') ?? false,
        ]);
    }

    public function updateAbout(Request $request): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'blocks' => ['required', 'array', 'size:3'],
            'blocks.*.key' => ['required', 'string', 'in:'.implode(',', array_keys(MissionAboutSection::DEFAULT_TITLES))],
            'blocks.*.title' => ['required', 'string', 'max:120'],
            'blocks.*.body' => ['nullable', 'string', 'max:20000'],
        ]);

        $sections = MissionAboutBootstrap::sectionsForChurch((int) $churchId);

        foreach ($valid['blocks'] as $block) {
            $key = $block['key'];
            if (! isset($sections[$key])) {
                continue;
            }
            $sections[$key]->update([
                'title' => $block['title'],
                'body' => $block['body'] ?? null,
            ]);
        }

        return redirect()->route('mission.content.about')->with('success', 'Conteúdo salvo.');
    }

    public function wallIndex(Request $request, DriveFolderCoverService $cover): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $items = MissionWallItem::query()
            ->with('creator')
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (MissionWallItem $item) use ($cover) {
                $autoCoverUrl = null;
                if (! $item->cover_image_url && $item->drive_folder_id) {
                    $autoCoverUrl = $cover->coverUrlForPublicFolder($item->drive_folder_id);
                }

                return [
                    'id' => $item->id,
                    'title' => $item->title,
                    'photographer_name' => $item->photographer_name,
                    'drive_folder_url' => $item->drive_folder_url,
                    'drive_folder_id' => $item->drive_folder_id,
                    'drive_embed_url' => $item->drive_folder_embed_url,
                    'drive_view_url' => $item->drive_folder_view_url,
                    'cover_image_url' => $item->cover_image_url,
                    'auto_cover_url' => $autoCoverUrl,
                    'sort_order' => $item->sort_order,
                    'published_at' => $item->published_at?->toIso8601String(),
                    'is_published' => $item->published_at !== null && $item->published_at->lte(now()),
                    'author' => $item->creator ? ['name' => $item->creator->name] : null,
                ];
            });

        return Inertia::render('Mission/Wall', [
            'items' => $items,
            'canManage' => $request->user()?->can('mission.manage') ?? false,
            'hasDriveApiKey' => filled(config('services.google.drive_api_key')),
        ]);
    }

    public function storeWallItem(Request $request): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'photographer_name' => ['nullable', 'string', 'max:255'],
            'drive_folder_url' => ['required', 'string', 'max:1024'],
            'cover_image_url' => ['nullable', 'string', 'max:1024'],
            'cover_image_file' => ['nullable', 'image', 'max:4096'],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $folderId = PhotoAlbum::driveFolderIdFromUrl($valid['drive_folder_url']);
        if ($folderId === null) {
            return redirect()->back()
                ->withErrors(['drive_folder_url' => 'Link do Google Drive inválido. Cole o link da pasta (drive/folders/...).'])
                ->withInput();
        }

        $publishedAt = $valid['published_at'] ?? null;
        if (! filled($publishedAt)) {
            $publishedAt = now();
        }

        $coverUrl = PhotoAlbum::normalizeCoverUrl($valid['cover_image_url'] ?? null);
        if ($request->hasFile('cover_image_file')) {
            $path = $request->file('cover_image_file')->store('mission/wall/covers', 'public');
            $coverUrl = StorageUrl::publicMediaUrl($path);
        }

        $maxOrder = (int) MissionWallItem::query()->where('church_id', $churchId)->max('sort_order');

        MissionWallItem::create([
            'church_id' => $churchId,
            'title' => $valid['title'],
            'photographer_name' => $valid['photographer_name'] ?? null,
            'drive_folder_url' => $valid['drive_folder_url'],
            'cover_image_url' => $coverUrl,
            'sort_order' => $valid['sort_order'] ?? ($maxOrder + 1),
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('mission.content.wall')->with('success', 'Álbum publicado no mural.');
    }

    public function updateWallItem(Request $request, MissionWallItem $missionWallItem): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionWallItem->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'photographer_name' => ['nullable', 'string', 'max:255'],
            'drive_folder_url' => ['required', 'string', 'max:1024'],
            'cover_image_url' => ['nullable', 'string', 'max:1024'],
            'cover_image_file' => ['nullable', 'image', 'max:4096'],
            'published_at' => ['nullable', 'date'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $folderId = PhotoAlbum::driveFolderIdFromUrl($valid['drive_folder_url']);
        if ($folderId === null) {
            return redirect()->back()
                ->withErrors(['drive_folder_url' => 'Link do Google Drive inválido. Cole o link da pasta (drive/folders/...).'])
                ->withInput();
        }

        $coverUrl = PhotoAlbum::normalizeCoverUrl($valid['cover_image_url'] ?? null);
        if ($request->hasFile('cover_image_file')) {
            $path = $request->file('cover_image_file')->store('mission/wall/covers', 'public');
            $coverUrl = StorageUrl::publicMediaUrl($path);
        }

        $missionWallItem->update([
            'title' => $valid['title'],
            'photographer_name' => $valid['photographer_name'] ?? null,
            'drive_folder_url' => $valid['drive_folder_url'],
            'cover_image_url' => $coverUrl,
            'published_at' => $valid['published_at'] ?? null,
            'sort_order' => $valid['sort_order'] ?? $missionWallItem->sort_order,
        ]);

        return redirect()->route('mission.content.wall')->with('success', 'Álbum atualizado.');
    }

    public function destroyWallItem(Request $request, MissionWallItem $missionWallItem): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionWallItem->church_id === (int) $churchId, 404);

        $missionWallItem->delete();

        return redirect()->route('mission.content.wall')->with('success', 'Álbum removido do mural.');
    }
}
