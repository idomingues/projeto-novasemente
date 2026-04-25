<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\PhotoAlbum;
use App\Services\DriveFolderCoverService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PhotoAlbumController extends Controller
{
    private function currentChurchId(): ?int
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }

        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(Request $request, DriveFolderCoverService $cover): Response
    {
        $churchId = $this->currentChurchId();

        $albums = PhotoAlbum::query()
            ->with('author')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (PhotoAlbum $a) use ($cover) {
                $autoCoverUrl = null;
                if (! $a->cover_image_url && $a->drive_folder_id) {
                    $autoCoverUrl = $cover->coverUrlForPublicFolder($a->drive_folder_id);
                }

                return [
                    'id' => $a->id,
                    'title' => $a->title,
                    'drive_folder_url' => $a->drive_folder_url,
                    'drive_folder_id' => $a->drive_folder_id,
                    'drive_embed_url' => $a->drive_folder_embed_url,
                    'drive_view_url' => $a->drive_folder_view_url,
                    'cover_image_url' => $a->cover_image_url,
                    'auto_cover_url' => $autoCoverUrl,
                    'published_at' => $a->published_at?->toIso8601String(),
                    'created_at' => $a->created_at->toIso8601String(),
                    'author' => $a->author ? ['name' => $a->author->name] : null,
                ];
            });

        $canManage = $request->user()?->can('photos.manage') ?? false;

        return Inertia::render('PhotoAlbums/Index', [
            'albums' => $albums,
            'canManage' => $canManage,
            'hasDriveApiKey' => filled(config('services.google.drive_api_key')),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('photos.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'drive_folder_url' => ['required', 'string', 'max:1024'],
            'cover_image_url' => ['nullable', 'url', 'max:1024'],
            'published_at' => ['nullable', 'date'],
        ]);

        $folderId = PhotoAlbum::driveFolderIdFromUrl($data['drive_folder_url']);
        if ($folderId === null) {
            return redirect()->back()
                ->withErrors(['drive_folder_url' => 'Link do Google Drive inválido. Cole o link da pasta (drive/folders/...).'])
                ->withInput();
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('photo-albums.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $publishedAt = $data['published_at'] ?? null;
        if (! filled($publishedAt)) {
            $publishedAt = now();
        }

        PhotoAlbum::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'drive_folder_url' => $data['drive_folder_url'],
            'cover_image_url' => $data['cover_image_url'] ?? null,
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('photo-albums.index')->with('success', 'Álbum publicado com sucesso.');
    }

    public function update(Request $request, PhotoAlbum $album)
    {
        $this->authorize('photos.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'drive_folder_url' => ['required', 'string', 'max:1024'],
            'cover_image_url' => ['nullable', 'url', 'max:1024'],
            'published_at' => ['nullable', 'date'],
        ]);

        $folderId = PhotoAlbum::driveFolderIdFromUrl($data['drive_folder_url']);
        if ($folderId === null) {
            return redirect()->back()
                ->withErrors(['drive_folder_url' => 'Link do Google Drive inválido. Cole o link da pasta (drive/folders/...).'])
                ->withInput();
        }

        $album->update([
            'title' => $data['title'],
            'drive_folder_url' => $data['drive_folder_url'],
            'cover_image_url' => $data['cover_image_url'] ?? null,
            'published_at' => $data['published_at'] ?? null,
        ]);

        return redirect()->route('photo-albums.index')->with('success', 'Álbum atualizado com sucesso.');
    }

    public function destroy(PhotoAlbum $album)
    {
        $this->authorize('photos.manage');

        $album->delete();

        return redirect()->route('photo-albums.index')->with('success', 'Álbum removido com sucesso.');
    }
}

