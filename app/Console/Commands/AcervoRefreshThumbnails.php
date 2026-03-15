<?php

namespace App\Console\Commands;

use App\Models\AcervoItem;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class AcervoRefreshThumbnails extends Command
{
    protected $signature = 'acervo:refresh-thumbnails {--all : Atualizar todos os itens (não apenas os sem thumbnail)}';

    protected $description = 'Atualiza thumbnails dos itens do acervo usando YouTube oEmbed';

    public function handle(): int
    {
        $query = AcervoItem::query();
        if (! $this->option('all')) {
            $query->whereNull('thumbnail_url')->orWhere('thumbnail_url', '');
        }
        $items = $query->get();

        if ($items->isEmpty()) {
            $this->info('Nenhum item para atualizar.');
            return 0;
        }

        $this->info("Processando {$items->count()} item(ns)...");

        $updated = 0;
        foreach ($items as $item) {
            $thumbnail = $this->fetchThumbnail($item->url);
            if ($thumbnail) {
                $item->update(['thumbnail_url' => $thumbnail]);
                $updated++;
                $this->line("  ✓ {$item->title}");
            } else {
                $this->warn("  ✗ {$item->title} (falha ao obter thumbnail)");
            }
        }

        $this->info("Concluído. {$updated} thumbnails atualizadas.");
        return 0;
    }

    private function fetchThumbnail(string $url): ?string
    {
        try {
            $isYoutube = str_contains($url, 'youtube.com') || str_contains($url, 'youtu.be');
            if (! $isYoutube) {
                return null;
            }
            $apiUrl = 'https://www.youtube.com/oembed?url=' . urlencode($url) . '&format=json';
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
