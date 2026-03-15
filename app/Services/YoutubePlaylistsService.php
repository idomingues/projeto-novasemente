<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class YoutubePlaylistsService
{
    public static function fetch(string $channelHandle = '@advnovasemente', ?string $channelId = null): array
    {
        $cacheKey = 'youtube_playlists_' . md5($channelHandle . ($channelId ?? ''));
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && count($cached) > 0) {
            return $cached;
        }

        $result = [];
        $apiKey = config('services.youtube.api_key');
        $channelId = $channelId ?? config('services.youtube.channel_id');

        if (! $apiKey) {
            return $result;
        }

        try {
            if (! $channelId) {
                $channelResponse = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/channels', [
                    'part' => 'id',
                    'forHandle' => $channelHandle,
                    'key' => $apiKey,
                ]);

                if ($channelResponse->successful() && ! isset($channelResponse->json()['error'])) {
                    $items = $channelResponse->json('items') ?? [];
                    $channelId = $items[0]['id'] ?? null;
                }
            }

            if ($channelId) {
                $playlistsResponse = Http::timeout(10)->get('https://www.googleapis.com/youtube/v3/playlists', [
                    'part' => 'snippet,contentDetails',
                    'channelId' => $channelId,
                    'maxResults' => 50,
                    'key' => $apiKey,
                ]);

                if ($playlistsResponse->successful() && ! isset($playlistsResponse->json()['error'])) {
                    $items = $playlistsResponse->json('items') ?? [];
                    foreach ($items as $item) {
                        $thumb = $item['snippet']['thumbnails']['high']['url']
                            ?? $item['snippet']['thumbnails']['medium']['url']
                            ?? $item['snippet']['thumbnails']['default']['url']
                            ?? null;
                        $itemCount = $item['contentDetails']['itemCount'] ?? 0;
                        $result[] = [
                            'id' => $item['id'],
                            'title' => $item['snippet']['title'],
                            'thumbnail' => $thumb,
                            'url' => 'https://www.youtube.com/playlist?list=' . $item['id'],
                            'videoCount' => (int) $itemCount,
                        ];
                    }
                    if (count($result) > 0) {
                        Cache::put($cacheKey, $result, 86400); // 24h
                    }
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return $result;
    }
}
