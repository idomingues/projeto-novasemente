<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class YoutubePlaylistImportService
{
    private const API_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

    /** Máximo de vídeos por importação (paginação; evita timeouts). */
    private const MAX_VIDEOS = 500;

    /**
     * Lista vídeos de uma playlist pública.
     * Tenta a YouTube Data API v3; se falhar (quota, chave, etc.), usa a página pública / feed Atom.
     *
     * @return array{ok: true, items: list<array{video_id: string, title: string}>}|array{ok: false, message: string}
     */
    public static function fetchPlaylistVideos(string $playlistId): array
    {
        $playlistId = trim($playlistId);
        if ($playlistId === '' || ! preg_match('/^[a-zA-Z0-9_-]+$/', $playlistId)) {
            return ['ok' => false, 'message' => 'ID da playlist inválido.'];
        }

        $apiResult = self::fetchViaDataApi($playlistId);
        if (($apiResult['ok'] ?? false) === true) {
            return $apiResult;
        }

        $publicResult = self::fetchViaPublicPlaylistPage($playlistId);
        if (($publicResult['ok'] ?? false) === true && ($publicResult['items'] ?? []) !== []) {
            return $publicResult;
        }

        $rssResult = self::fetchViaAtomFeed($playlistId);
        if (($rssResult['ok'] ?? false) === true && ($rssResult['items'] ?? []) !== []) {
            return $rssResult;
        }

        return $apiResult['ok'] === false
            ? $apiResult
            : ['ok' => false, 'message' => 'Não foi possível ler a playlist (verifique o link).'];
    }

    /**
     * @return array{ok: true, items: list<array{video_id: string, title: string}>}|array{ok: false, message: string}
     */
    private static function fetchViaDataApi(string $playlistId): array
    {
        $apiKey = config('services.youtube.api_key');
        if (! is_string($apiKey) || $apiKey === '') {
            return ['ok' => false, 'message' => 'Chave da API YouTube não configurada (YOUTUBE_API_KEY no .env).'];
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
     * Fallback sem API: lê ytInitialData da página pública da playlist.
     *
     * @return array{ok: true, items: list<array{video_id: string, title: string}>}|array{ok: false, message: string}
     */
    private static function fetchViaPublicPlaylistPage(string $playlistId): array
    {
        try {
            $response = Http::timeout(20)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; NovaSemente/1.0)',
                    'Accept-Language' => 'pt-BR,pt;q=0.9,en;q=0.8',
                ])
                ->get('https://www.youtube.com/playlist', ['list' => $playlistId]);

            if (! $response->successful()) {
                return ['ok' => false, 'message' => 'Não foi possível abrir a página da playlist.'];
            }

            $html = $response->body();
            if (! preg_match('/ytInitialData\s*=\s*(\{.+?\});/s', $html, $m)) {
                return ['ok' => false, 'message' => 'Não foi possível ler os vídeos da playlist.'];
            }

            $data = json_decode($m[1], true);
            if (! is_array($data)) {
                return ['ok' => false, 'message' => 'Não foi possível ler os vídeos da playlist.'];
            }

            $lockups = [];
            self::collectByKey($data, 'lockupViewModel', $lockups);
            $legacy = [];
            self::collectByKey($data, 'playlistVideoRenderer', $legacy);

            $items = [];
            $seen = [];

            foreach ($lockups as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $videoId = $row['contentId'] ?? '';
                if (! is_string($videoId) || strlen($videoId) !== 11 || isset($seen[$videoId])) {
                    continue;
                }
                $title = $row['metadata']['lockupMetadataViewModel']['title']['content'] ?? '';
                $title = is_string($title) ? trim($title) : '';
                if ($title === '') {
                    $title = 'Sem título';
                }
                $seen[$videoId] = true;
                $items[] = ['video_id' => $videoId, 'title' => $title];
                if (count($items) >= self::MAX_VIDEOS) {
                    break;
                }
            }

            if ($items === []) {
                foreach ($legacy as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $videoId = $row['videoId'] ?? '';
                    if (! is_string($videoId) || strlen($videoId) !== 11 || isset($seen[$videoId])) {
                        continue;
                    }
                    $title = $row['title']['runs'][0]['text']
                        ?? $row['title']['simpleText']
                        ?? '';
                    $title = is_string($title) ? trim($title) : '';
                    if ($title === '') {
                        $title = 'Sem título';
                    }
                    $seen[$videoId] = true;
                    $items[] = ['video_id' => $videoId, 'title' => $title];
                    if (count($items) >= self::MAX_VIDEOS) {
                        break;
                    }
                }
            }

            if ($items === []) {
                return ['ok' => false, 'message' => 'Nenhum vídeo encontrado na playlist.'];
            }

            return ['ok' => true, 'items' => $items];
        } catch (\Throwable $e) {
            report($e);

            return ['ok' => false, 'message' => 'Falha ao ler a página da playlist.'];
        }
    }

    /**
     * Fallback leve: feed Atom público (até ~15 vídeos recentes).
     *
     * @return array{ok: true, items: list<array{video_id: string, title: string}>}|array{ok: false, message: string}
     */
    private static function fetchViaAtomFeed(string $playlistId): array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0 (compatible; NovaSemente/1.0)'])
                ->get('https://www.youtube.com/feeds/videos.xml', ['playlist_id' => $playlistId]);

            if (! $response->successful()) {
                return ['ok' => false, 'message' => 'Não foi possível ler o feed da playlist.'];
            }

            $xml = @simplexml_load_string($response->body());
            if ($xml === false) {
                return ['ok' => false, 'message' => 'Feed da playlist inválido.'];
            }

            $xml->registerXPathNamespace('atom', 'http://www.w3.org/2005/Atom');
            $xml->registerXPathNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');

            $items = [];
            foreach ($xml->xpath('//atom:entry') ?: [] as $entry) {
                $videoNodes = $entry->xpath('./yt:videoId');
                $videoId = isset($videoNodes[0]) ? trim((string) $videoNodes[0]) : '';
                if ($videoId === '' || strlen($videoId) !== 11) {
                    continue;
                }
                $title = trim((string) ($entry->title ?? ''));
                if ($title === '') {
                    $title = 'Sem título';
                }
                $items[] = ['video_id' => $videoId, 'title' => $title];
                if (count($items) >= self::MAX_VIDEOS) {
                    break;
                }
            }

            if ($items === []) {
                return ['ok' => false, 'message' => 'Nenhum vídeo encontrado no feed da playlist.'];
            }

            return ['ok' => true, 'items' => $items];
        } catch (\Throwable $e) {
            report($e);

            return ['ok' => false, 'message' => 'Falha ao ler o feed da playlist.'];
        }
    }

    /**
     * @param  mixed  $node
     * @param  list<mixed>  $out
     */
    private static function collectByKey(mixed $node, string $key, array &$out, int $depth = 0): void
    {
        if ($depth > 40 || ! is_array($node)) {
            return;
        }

        foreach ($node as $k => $v) {
            if ($k === $key) {
                $out[] = $v;
            }
            if (is_array($v)) {
                self::collectByKey($v, $key, $out, $depth + 1);
            }
        }
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
