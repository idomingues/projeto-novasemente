<?php

namespace Database\Seeders;

use App\Models\AcervoItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

class AcervoItemSeeder extends Seeder
{
    private array $items = [
        ['title' => 'Comunidade', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAbpwFFKvsKAOfo9yX73HPeU'],
        ['title' => 'Comunidade 2022', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAY9NAa3BN1WTSIx8hhW6dr_'],
        ['title' => 'Louvor e Banda Nova Semente', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAaqJQcdEJCESy1DkJcZaxe3'],
        ['title' => 'NS - Lugar Melhor DVD', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZYynvfTKbmgQl7jQksn6Um'],
        ['title' => 'Série - QUAL É O SEU NOME?', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAaYLOBACRsdFK6jd9aIszdf'],
        ['title' => 'Série - ESTAÇÕES DA VIDA', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZDTVkvLymu3E4sfnJZUTU6'],
        ['title' => 'Série - SIMPLES ASSIM…', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZz8KVowwfA85YvLNTByZ-C'],
        ['title' => 'Série - ENTRE A FÉ E A DÚVIDA', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZTSrzokEgwR5oBsLHUgTGO'],
        ['title' => 'O Santuário no tempo', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZqeajL_S1hF-opRMQPAXn2'],
        ['title' => 'Deserto', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAbze6_K2-PByiSPqmctqS5b'],
        ['title' => 'Enviados', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAYQU5AjvV2M7F_KeFXkt-D5'],
        ['title' => 'Ainda que morra', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAa51HX5c5G8f7epNILcVle5'],
        ['title' => 'Começos 2021', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAaQY_sZhwy45ccuFxYp0o7X'],
        ['title' => 'Série - NO PRINCÍPIO - Edson Nunes Jr', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZPpZ3WqVtDHUyEcJ67CkmK'],
        ['title' => 'Re Pensando - No Princípio (Comentários)', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAayG9Oml6mFHFeNkrFJP8qa'],
        ['title' => 'Princípio e Fim', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAYhweAEeOqyN82xlrO1GuqM'],
        ['title' => 'Alianças: de Gênesis ao Apocalipse', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ0aKxJUBe3Z51WrMrbrSIv'],
        ['title' => 'Boas Novas', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAbpOAj1V0yFo0mOThGeWrGz'],
        ['title' => 'Olhos que Condenam', 'url' => 'https://www.youtube.com/playlist?list=PL_Egd78NnIAZ2XgLKlx43c6F8mFtK-N_b'],
    ];

    public function run(): void
    {
        $order = (AcervoItem::max('order') ?? 0) + 1;

        foreach ($this->items as $item) {
            $url = str_replace('m.youtube.com', 'www.youtube.com', $item['url']);
            $thumbnail = $this->fetchThumbnail($url);

            AcervoItem::firstOrCreate(
                ['url' => $url],
                [
                    'title' => $item['title'],
                    'thumbnail_url' => $thumbnail,
                    'video_count' => null,
                    'order' => $order++,
                ]
            );
        }
    }

    private function fetchThumbnail(string $url): ?string
    {
        try {
            // YouTube oEmbed suporta playlists (noembed não)
            $isYoutube = str_contains($url, 'youtube.com') || str_contains($url, 'youtu.be');
            $apiUrl = $isYoutube
                ? 'https://www.youtube.com/oembed?url=' . urlencode($url) . '&format=json'
                : 'https://noembed.com/embed?url=' . urlencode($url);
            $response = Http::timeout(10)->get($apiUrl);
            if ($response->successful()) {
                return $response->json('thumbnail_url');
            }
        } catch (\Throwable $e) {
            // ignore
        }
        return null;
    }
}
