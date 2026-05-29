<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Musica;
use App\Services\YoutubePlaylistImportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class MusicaController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $musicas = Musica::query()
            ->with('author')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Musica $m) => [
                'id' => $m->id,
                'title' => $m->title,
                'youtube_url' => $m->youtube_url,
                'youtube_embed_url' => $m->youtube_embed_url,
                'youtube_thumb_url' => $m->youtube_thumb_url,
                'published_at' => $m->published_at?->toIso8601String(),
                'created_at' => $m->created_at->toIso8601String(),
                'author' => $m->author ? ['name' => $m->author->name] : null,
            ]);

        $canManage = $request->user()?->can('music.manage') ?? false;

        return Inertia::render('Music/Index', [
            'musicas' => $musicas,
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('music.manage');

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Musica::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = $this->fetchYoutubeTitle($data['youtube_url']) ?? 'Sem título';
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('musica.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $publishedAt = $data['published_at'] ?? null;
        if (! filled($publishedAt)) {
            $publishedAt = now();
        }

        $musica = Musica::create([
            'church_id' => $churchId,
            'title' => $title,
            'youtube_url' => $data['youtube_url'],
            'published_at' => $publishedAt,
            'created_by' => $request->user()?->id,
        ]);

        return ListModalRedirect::toIndexEdit('musica.index', $musica, 'Música adicionada com sucesso.');
    }

    public function update(Request $request, Musica $musica)
    {
        $this->authorize('music.manage');

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Musica::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = $this->fetchYoutubeTitle($data['youtube_url']) ?? 'Sem título';
        }

        $musica->update([
            'title' => $title,
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
        ]);

        return ListModalRedirect::toIndexEdit('musica.index', $musica, 'Música atualizada com sucesso.');
    }

    public function destroy(Musica $musica)
    {
        $this->authorize('music.manage');

        $musica->delete();

        return redirect()->route('musica.index')->with('success', 'Música removida com sucesso.');
    }

    public function importPlaylist(Request $request)
    {
        $this->authorize('music.manage');

        if ($request->input('published_at') === '') {
            $request->merge(['published_at' => null]);
        }

        $data = $request->validate([
            'playlist_url' => ['required', 'string', 'max:1024'],
            'published_at' => ['nullable', 'date'],
        ]);

        $playlistId = Musica::youtubePlaylistIdFromUrl($data['playlist_url']);
        if ($playlistId === null) {
            return redirect()->back()->withErrors([
                'playlist_url' => 'Cole um link com list=… (página da playlist ou vídeo com playlist).',
            ])->withInput();
        }

        if (! filled(config('services.youtube.api_key'))) {
            return redirect()->back()->with(
                'error',
                'Configure YOUTUBE_API_KEY no .env para importar playlists.'
            );
        }

        $fetched = YoutubePlaylistImportService::fetchPlaylistVideos($playlistId);
        if (! $fetched['ok']) {
            $msg = $fetched['message'];

            return redirect()->back()
                ->withErrors(['playlist_url' => $msg])
                ->with('error', $msg)
                ->withInput();
        }

        $videos = $fetched['items'];
        if (count($videos) === 0) {
            return redirect()->back()->with(
                'error',
                'A playlist não devolveu vídeos (vazia, privada ou indisponível para a API).'
            );
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('musica.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $existingVideoIds = Musica::query()
            ->where('church_id', $churchId)
            ->pluck('youtube_url')
            ->map(fn ($url) => Musica::youtubeVideoId(is_string($url) ? $url : ''))
            ->filter()
            ->all();
        $seen = array_flip($existingVideoIds);

        $publishedAt = $data['published_at'] ?? null;
        $userId = $request->user()?->id;

        $imported = 0;
        $skipped = 0;

        DB::transaction(function () use ($videos, $churchId, $publishedAt, $userId, &$seen, &$imported, &$skipped): void {
            foreach ($videos as $row) {
                $videoId = $row['video_id'];
                if (isset($seen[$videoId])) {
                    $skipped++;

                    continue;
                }
                Musica::create([
                    'church_id' => $churchId,
                    'title' => $row['title'],
                    'youtube_url' => Musica::canonicalYoutubeWatchUrl($videoId),
                    'published_at' => $publishedAt,
                    'created_by' => $userId,
                ]);
                $seen[$videoId] = true;
                $imported++;
            }
        });

        if ($imported === 0) {
            return redirect()->route('musica.index')->with(
                'success',
                'Nenhuma música nova: todos os vídeos desta playlist já estavam cadastrados.'
            );
        }

        $msg = "Importação concluída: {$imported} música(s) adicionada(s).";
        if ($skipped > 0) {
            $msg .= " {$skipped} ignorada(s) (já existiam).";
        }

        return redirect()->route('musica.index')->with('success', $msg);
    }

    private function fetchYoutubeTitle(string $youtubeUrl): ?string
    {
        try {
            $normalized = trim($youtubeUrl);
            $response = Http::timeout(10)->get('https://www.youtube.com/oembed', [
                'url' => $normalized,
                'format' => 'json',
            ]);
            if (! $response->successful()) {
                return null;
            }
            $title = $response->json('title');
            if (! is_string($title)) {
                return null;
            }
            $title = trim($title);

            return $title !== '' ? $title : null;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }
}
