<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ClearYoutubeCache extends Command
{
    protected $signature = 'youtube:clear-cache';
    protected $description = 'Limpa o cache de playlists do YouTube (força nova busca na próxima visita ao Acervo)';

    public function handle(): int
    {
        $key = 'youtube_playlists_' . md5('@advnovasemente');
        Cache::forget($key);
        $this->info('Cache de playlists do YouTube limpo. A próxima visita ao Acervo buscará dados novos da API.');
        return 0;
    }
}
