<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class YoutubePlaylistImportService
{
    private const API_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

    /** Máximo de vídeos por importação (paginação; evita timeouts). */
    private const MAX_VIDEOS = 500;

    /**
     * Lista vídeos de uma playlist pública (YouTube Data API v3).
     *
     * @return array{ok: true, items: list<array{video_id: string, title: string}>}|array{ok: false, message: string}
     */
    public static function fetchPlaylistVideos(string $playlistId): array
    {
        $apiKey = config('services.youtube.api_key');
        if (! is_string($apiKey) || $apiKey === '') {
            return ['ok' => false, 'message' => 'Chave da API YouTube não configurada (YOUTUBE_API_KEY no .env).'];
        }

        $playlistId = trim($playlistId);
        if ($playlistId === '' || ! preg_match('/^[a-zA-Z0-9_-]+$/', $playlistId)) {
            return ['ok' => false, 'message' => 'ID da playlist inválido.'];
        }

        $items = [];
        $pageToken = null;

        try {
            do {
                $params = [
                    'part' => 'snippet,contentDetails',
                    'playlistId' => $playlistId,
                    'maxResults' => 50,
                    'key' => $apiKey,
                ];
                if ($pageToken !== null) {
                    $params['pageToken'] = $pageToken;
                }

                $response = Http::timeout(20)->get(self::API_URL, $params);
                $json = $response->json();

                if (! $response->successful() || isset($json['error'])) {
                    $raw = is_array($json['error'] ?? null)
                        ? (string) ($json['error']['message'] ?? 'Erro na API do YouTube.')
                        : 'Não foi possível ler a playlist (verifique o link e a chave da API).';

                    return ['ok' => false, 'message' => self::humanizeYoutubeApiError($raw)];
                }

                foreach ($json['items'] ?? [] as $row) {
                    $snippet = $row['snippet'] ?? [];
                    $resourceId = $snippet['resourceId'] ?? [];
                    if (($resourceId['kind'] ?? '') !== 'youtube#video') {
                        continue;
                    }
                    $videoId = $resourceId['videoId'] ?? '';
                    if (! is_string($videoId) || strlen($videoId) !== 11) {
                        continue;
                    }
                    $title = $snippet['title'] ?? '';
                    $title = is_string($title) ? trim($title) : '';
                    if ($title === '') {
                        $title = 'Sem título';
                    }
                    $items[] = ['video_id' => $videoId, 'title' => $title];
                    if (count($items) >= self::MAX_VIDEOS) {
                        $pageToken = null;
                        break 2;
                    }
                }

                $pageToken = $json['nextPageToken'] ?? null;
            } while (is_string($pageToken) && $pageToken !== '');
        } catch (\Throwable $e) {
            report($e);

            return ['ok' => false, 'message' => 'Falha ao contactar a API do YouTube. Tente de novo mais tarde.'];
        }

        return ['ok' => true, 'items' => $items];
    }

    /**
     * Converte mensagens da API (muitas vezes com HTML) em texto legível e PT quando possível.
     */
    private static function humanizeYoutubeApiError(string $rawMessage): string
    {
        $plain = trim(html_entity_decode(strip_tags($rawMessage), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $lower = strtolower($rawMessage.' '.$plain);

        if (str_contains($lower, 'quota') || str_contains($lower, 'exceeded')) {
            return 'A quota diária da YouTube Data API para esta chave foi excedida. A quota renova à meia-noite (horário do Pacífico). Pode criar outro projeto/chave no Google Cloud Console ou ativar faturação para limites maiores. Atualize YOUTUBE_API_KEY no .env.';
        }

        if (str_contains($lower, 'access not configured') || str_contains($lower, 'api key not valid')) {
            return 'A YouTube Data API v3 não está ativa para este projeto ou a chave é inválida. Ative a API no Google Cloud Console e confira YOUTUBE_API_KEY.';
        }

        if (str_contains($lower, 'playlistnotfound') || (str_contains($lower, 'not found') && str_contains($lower, 'playlist'))) {
            return 'Playlist não encontrada ou não acessível com esta chave (verifique se o link está correto e se a playlist é pública).';
        }

        return $plain !== '' ? $plain : 'Erro na API do YouTube.';
    }
}
