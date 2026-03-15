<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestYoutubeApi extends Command
{
    protected $signature = 'youtube:test';
    protected $description = 'Testa a API do YouTube para o Acervo (playlists)';

    public function handle(): int
    {
        $apiKey = config('services.youtube.api_key');
        if (! $apiKey) {
            $this->error('YOUTUBE_API_KEY não está definida no .env');
            return 1;
        }

        $this->info('Testando API do YouTube...');

        $channelResponse = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/channels', [
            'part' => 'id,snippet',
            'forHandle' => '@advnovasemente',
            'key' => $apiKey,
        ]);

        if (! $channelResponse->successful()) {
            $this->error('Erro na requisição do canal: ' . $channelResponse->status());
            $body = $channelResponse->json();
            if (isset($body['error']['message'])) {
                $this->line($body['error']['message']);
            }
            if (isset($body['error']['errors'])) {
                foreach ($body['error']['errors'] as $err) {
                    $this->line('  - ' . ($err['message'] ?? json_encode($err)));
                }
            }
            return 1;
        }

        $body = $channelResponse->json();
        if (isset($body['error'])) {
            $this->error('API retornou erro: ' . ($body['error']['message'] ?? 'Desconhecido'));
            return 1;
        }

        $items = $body['items'] ?? [];
        if (empty($items)) {
            $this->warn('Canal @advnovasemente não encontrado. Tente definir YOUTUBE_CHANNEL_ID no .env.');
            return 1;
        }

        $channelId = $items[0]['id'];
        $channelTitle = $items[0]['snippet']['title'] ?? 'N/A';
        $this->info("Canal encontrado: {$channelTitle} (ID: {$channelId})");

        $playlistsResponse = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/playlists', [
            'part' => 'snippet,contentDetails',
            'channelId' => $channelId,
            'maxResults' => 50,
            'key' => $apiKey,
        ]);

        if (! $playlistsResponse->successful()) {
            $this->error('Erro ao buscar playlists: ' . $playlistsResponse->status());
            return 1;
        }

        $plBody = $playlistsResponse->json();
        if (isset($plBody['error'])) {
            $this->error('API retornou erro nas playlists.');
            return 1;
        }

        $playlists = $plBody['items'] ?? [];
        $this->info('Playlists encontradas: ' . count($playlists));
        foreach ($playlists as $p) {
            $title = $p['snippet']['title'] ?? '?';
            $count = $p['contentDetails']['itemCount'] ?? 0;
            $this->line("  - {$title} ({$count} vídeos)");
        }

        $this->newLine();
        $this->info('Se YOUTUBE_CHANNEL_ID não estiver no .env, adicione:');
        $this->line("YOUTUBE_CHANNEL_ID={$channelId}");

        return 0;
    }
}
