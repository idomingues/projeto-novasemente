<?php

namespace App\Http\Controllers;

use App\Models\AcervoItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AcervoController extends Controller
{
    public function index(): Response
    {
        $items = AcervoItem::query()
            ->orderByDesc('created_at')
            ->orderBy('title')
            ->get()
            ->map(fn (AcervoItem $item) => [
                'id' => $item->id,
                'url' => $item->url,
                'title' => $item->title,
                'thumbnail' => $item->thumbnail_url,
                'videoCount' => $item->video_count,
            ]);

        return Inertia::render('Acervo/Index', [
            'items' => $items,
            'canManage' => true,
        ]);
    }

    public function store(Request $request)
    {
        $valid = $request->validate([
            'url' => ['required', 'string', 'url'],
        ]);

        $normalizedUrl = $this->normalizeUrl($valid['url']);
        if (AcervoItem::where('url', $normalizedUrl)->exists()) {
            return redirect()->back()->withErrors(['url' => 'Este link já está cadastrado no acervo.']);
        }

        $data = $this->fetchMetadata($valid['url']);
        if (! $data) {
            return redirect()->back()->withErrors(['url' => 'Não foi possível obter dados do link. Verifique se é um link válido do YouTube.']);
        }

        $maxOrder = AcervoItem::max('order') ?? 0;

        AcervoItem::create([
            'url' => $normalizedUrl,
            'title' => $data['title'],
            'thumbnail_url' => $data['thumbnail_url'],
            'video_count' => $data['video_count'],
            'order' => $maxOrder + 1,
        ]);

        return redirect()->route('acervo.index')->with('success', 'Item adicionado ao acervo.');
    }

    public function update(Request $request, AcervoItem $acervo)
    {
        $valid = $request->validate([
            'url' => ['required', 'string', 'url'],
        ]);

        $normalizedUrl = $this->normalizeUrl($valid['url']);
        if (AcervoItem::where('url', $normalizedUrl)->where('id', '!=', $acervo->id)->exists()) {
            return redirect()->back()->withErrors(['url' => 'Este link já está cadastrado no acervo.']);
        }

        $data = $this->fetchMetadata($valid['url']);
        if (! $data) {
            return redirect()->back()->withErrors(['url' => 'Não foi possível obter dados do link.']);
        }

        $acervo->update([
            'url' => $normalizedUrl,
            'title' => $data['title'],
            'thumbnail_url' => $data['thumbnail_url'],
            'video_count' => $data['video_count'],
        ]);

        return redirect()->route('acervo.index')->with('success', 'Item atualizado.');
    }

    public function destroy(AcervoItem $acervo)
    {
        $acervo->delete();
        return redirect()->route('acervo.index')->with('success', 'Item removido.');
    }

    private function normalizeUrl(string $url): string
    {
        $url = trim($url);
        if (preg_match('/list=([a-zA-Z0-9_-]+)/', $url, $m)) {
            return 'https://www.youtube.com/playlist?list=' . $m[1];
        }
        if (preg_match('/watch\?v=([a-zA-Z0-9_-]+)/', $url, $m)) {
            $list = preg_match('/list=([a-zA-Z0-9_-]+)/', $url, $listM) ? '&list=' . $listM[1] : '';
            return 'https://www.youtube.com/watch?v=' . $m[1] . $list;
        }
        return $url;
    }

    private function fetchMetadata(string $url): ?array
    {
        $normalized = $this->normalizeUrl($url);
        $videoId = $this->extractVideoId($normalized);

        // YouTube oEmbed suporta vídeos e playlists (noembed não suporta playlists)
        $isYoutube = str_contains($normalized, 'youtube.com') || str_contains($url, 'youtu.be');
        $apiUrl = $isYoutube
            ? 'https://www.youtube.com/oembed?url=' . urlencode($normalized) . '&format=json'
            : 'https://noembed.com/embed?url=' . urlencode($normalized);

        $response = Http::timeout(10)->get($apiUrl);

        $title = null;
        $thumbnail = null;

        if ($response->successful()) {
            $json = $response->json();
            $title = $json['title'] ?? null;
            $thumbnail = $json['thumbnail_url'] ?? null;
        }

        if (! $thumbnail && $videoId) {
            $thumbnail = "https://i.ytimg.com/vi/{$videoId}/hqdefault.jpg";
        }

        if (! $title) {
            $title = 'Sem título';
        }

        return [
            'title' => $title,
            'thumbnail_url' => $thumbnail,
            'video_count' => null,
        ];
    }

    private function extractVideoId(string $url): ?string
    {
        if (preg_match('/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:\?|&|$)/', $url, $m)) {
            return $m[1];
        }
        return null;
    }
}
