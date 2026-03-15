<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Musica;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MusicaController extends Controller
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

    public function index(Request $request): Response
    {
        $this->authorize('music.manage');

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

        return Inertia::render('Music/Index', [
            'musicas' => $musicas,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('music.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Musica::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('musica.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        Musica::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('musica.index')->with('success', 'Música adicionada com sucesso.');
    }

    public function update(Request $request, Musica $musica)
    {
        $this->authorize('music.manage');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Musica::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $musica->update([
            'title' => $data['title'],
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
        ]);

        return redirect()->route('musica.index')->with('success', 'Música atualizada com sucesso.');
    }

    public function destroy(Musica $musica)
    {
        $this->authorize('music.manage');

        $musica->delete();

        return redirect()->route('musica.index')->with('success', 'Música removida com sucesso.');
    }
}
