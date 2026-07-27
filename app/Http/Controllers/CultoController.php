<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\Culto;
use App\Models\User;
use App\Services\PublicationBroadcastNotifier;
use App\Support\CultoEpisodeCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class CultoController extends Controller
{
    public function __construct(
        private readonly PublicationBroadcastNotifier $publicationBroadcast,
    ) {}

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
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $this->assertCanManageCulto($request->user());

        $churchId = $this->currentChurchId();
        $cultos = CultoEpisodeCatalog::dedupeByYoutubeVideo(
            Culto::query()
                ->with('author')
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
                ->orderByDesc('published_at')
                ->orderByDesc('created_at')
                ->get(),
        )
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
            'title' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Culto::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = $this->fetchYoutubeTitle($data['youtube_url']) ?? 'Sem título';
        }

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('culto.index')->with('error', 'Nenhuma igreja ativa. Associe uma igreja primeiro.');
        }

        $culto = Culto::create([
            'church_id' => $churchId,
            'title' => $title,
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        $this->publicationBroadcast->notifyCulto($culto, $request->user()?->id);

        return ListModalRedirect::toIndexEdit('culto.index', $culto, 'Culto criado com sucesso.');
    }

    public function update(Request $request, Culto $culto)
    {
        $this->assertCanManageCulto($request->user());

        $data = $request->validate([
            'title' => ['nullable', 'string', 'max:255'],
            'youtube_url' => ['required', 'string', 'max:512'],
            'published_at' => ['nullable', 'date'],
        ]);

        if (Culto::youtubeVideoId($data['youtube_url']) === null) {
            return redirect()->back()->withErrors(['youtube_url' => 'URL do YouTube inválida. Use um link de vídeo do YouTube.'])->withInput();
        }

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $title = $this->fetchYoutubeTitle($data['youtube_url']) ?? 'Sem título';
        }

        $culto->update([
            'title' => $title,
            'youtube_url' => $data['youtube_url'],
            'published_at' => $data['published_at'] ?? null,
        ]);

        return ListModalRedirect::toIndexEdit('culto.index', $culto, 'Culto atualizado com sucesso.');
    }

    public function destroy(Culto $culto)
    {
        $this->assertCanManageCulto(request()->user());

        $culto->delete();

        if (request()->expectsJson()) {
            return response()->json(['message' => 'Culto removido com sucesso.']);
        }

        return redirect()->route('culto.index')->with('success', 'Culto removido com sucesso.');
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
