<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Culto;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CultoController extends Controller
{
    private function assertCanManageCulto(?User $user): void
    {
        if (! $user) {
            abort(403);
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return;
        }
        if ($user->can('culto.manage')) {
            return;
        }
        abort(403);
    }

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
        $this->assertCanManageCulto($request->user());

        $churchId = $this->currentChurchId();
        $cultos = Culto::query()
            ->with('author')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('published_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Culto $c) => [
                'id' => $c->id,
                'title' => $c->title,
                'youtube_url' => $c->youtube_url,
                'youtube_embed_url' => $c->youtube_embed_url,
                'youtube_thumb_url' => $c->youtube_thumb_url,
                'published_at' => $c->published_at?->toIso8601String(),
                'created_at' => $c->created_at->toIso8601String(),
                'author' => $c->author ? ['name' => $c->author->name] : null,
            ]);

        return Inertia::render('Culto/Index', [
            'cultos' => $cultos,
            'isMobilePreview' => true,
        ]);
    }

    public function store(Request $request)
    {
        $this->assertCanManageCulto($request->user());

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Culto::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('culto.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        Culto::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('culto.index')->with('success', 'Culto criado com sucesso.');
    }

    public function update(Request $request, Culto $culto)
    {
        $this->assertCanManageCulto($request->user());

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Culto::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $culto->update([
            'title' => $data['title'],
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
        ]);

        return redirect()->route('culto.index')->with('success', 'Culto atualizado com sucesso.');
    }

    public function destroy(Culto $culto)
    {
        $this->assertCanManageCulto(request()->user());

        $culto->delete();

        return redirect()->route('culto.index')->with('success', 'Culto removido com sucesso.');
    }
}
