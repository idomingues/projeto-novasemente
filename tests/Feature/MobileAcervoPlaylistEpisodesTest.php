<?php

namespace Tests\Feature;

use App\Models\AcervoItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MobileAcervoPlaylistEpisodesTest extends TestCase
{
    use RefreshDatabase;

    public function test_acervo_show_lists_all_playlist_episodes(): void
    {
        config(['services.youtube.api_key' => 'test-youtube-key']);
        Cache::flush();

        $playlistId = 'PL2kd2685Ul2kEDe01Ye019x0HolNv0JHx';
        $item = AcervoItem::query()->create([
            'url' => "https://www.youtube.com/playlist?list={$playlistId}",
            'title' => 'Série de teste',
            'thumbnail_url' => null,
            'video_count' => null,
            'order' => 1,
        ]);

        Http::fake([
            'www.googleapis.com/youtube/v3/playlistItems*' => Http::response([
                'items' => [
                    [
                        'snippet' => [
                            'title' => 'Episódio 1',
                            'resourceId' => ['kind' => 'youtube#video', 'videoId' => 'aaaaaaaaaaa'],
                        ],
                    ],
                    [
                        'snippet' => [
                            'title' => 'Episódio 2',
                            'resourceId' => ['kind' => 'youtube#video', 'videoId' => 'bbbbbbbbbbb'],
                        ],
                    ],
                    [
                        'snippet' => [
                            'title' => 'Episódio 3',
                            'resourceId' => ['kind' => 'youtube#video', 'videoId' => 'ccccccccccc'],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $this->get(route('mobile.acervo.show', $item))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/AcervoShow')
                ->where('item.title', 'Série de teste')
                ->where('item.playlist_id', $playlistId)
                ->where('item.videoCount', 3)
                ->has('item.episodes', 3)
                ->where('item.episodes.0.title', 'Episódio 1')
                ->where('item.episodes.1.title', 'Episódio 2')
                ->where('item.episodes.2.title', 'Episódio 3')
                ->where('item.embed_url', "https://www.youtube.com/embed/aaaaaaaaaaa?list={$playlistId}")
            );
    }

    public function test_acervo_show_prefers_playlist_over_single_video_in_watch_url(): void
    {
        config(['services.youtube.api_key' => 'test-youtube-key']);
        Cache::flush();

        $playlistId = 'PLxyz0123456789abcdefABCDEF';
        $item = AcervoItem::query()->create([
            'url' => "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list={$playlistId}",
            'title' => 'Série com watch+list',
            'thumbnail_url' => null,
            'video_count' => null,
            'order' => 1,
        ]);

        Http::fake([
            'www.googleapis.com/youtube/v3/playlistItems*' => Http::response([
                'items' => [
                    [
                        'snippet' => [
                            'title' => 'Primeiro',
                            'resourceId' => ['kind' => 'youtube#video', 'videoId' => '11111111111'],
                        ],
                    ],
                    [
                        'snippet' => [
                            'title' => 'Segundo',
                            'resourceId' => ['kind' => 'youtube#video', 'videoId' => '22222222222'],
                        ],
                    ],
                ],
            ], 200),
        ]);

        $this->get(route('mobile.acervo.show', $item))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/AcervoShow')
                ->where('item.playlist_id', $playlistId)
                ->has('item.episodes', 2)
                ->where('item.embed_url', "https://www.youtube.com/embed/11111111111?list={$playlistId}")
            );
    }

    public function test_acervo_show_falls_back_to_public_playlist_when_api_quota_exceeded(): void
    {
        config(['services.youtube.api_key' => 'test-youtube-key']);
        Cache::flush();

        $playlistId = 'PL_Egd78NnIAZFq_-dUbI_XQZa1pAx6lEe';
        $item = AcervoItem::query()->create([
            'url' => "https://www.youtube.com/playlist?list={$playlistId}",
            'title' => 'Série com fallback',
            'thumbnail_url' => null,
            'video_count' => null,
            'order' => 1,
        ]);

        $ytInitialData = json_encode([
            'contents' => [
                'sectionListRenderer' => [
                    'contents' => [
                        [
                            'itemSectionRenderer' => [
                                'contents' => [
                                    [
                                        'lockupViewModel' => [
                                            'contentId' => 'rzY122MNf9A',
                                            'metadata' => [
                                                'lockupMetadataViewModel' => [
                                                    'title' => ['content' => 'Episódio A'],
                                                ],
                                            ],
                                        ],
                                    ],
                                    [
                                        'lockupViewModel' => [
                                            'contentId' => 'sbyev3UYX0U',
                                            'metadata' => [
                                                'lockupMetadataViewModel' => [
                                                    'title' => ['content' => 'Episódio B'],
                                                ],
                                            ],
                                        ],
                                    ],
                                    [
                                        'lockupViewModel' => [
                                            'contentId' => 'hJszaWJcmUM',
                                            'metadata' => [
                                                'lockupMetadataViewModel' => [
                                                    'title' => ['content' => 'Episódio C'],
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ], JSON_UNESCAPED_SLASHES);

        Http::fake([
            'www.googleapis.com/youtube/v3/playlistItems*' => Http::response([
                'error' => [
                    'message' => 'The request cannot be completed because you have exceeded your <b>quota</b>.',
                ],
            ], 403),
            'www.youtube.com/playlist*' => Http::response(
                '<html><script>var ytInitialData = '.$ytInitialData.';</script></html>',
                200
            ),
        ]);

        $this->get(route('mobile.acervo.show', $item))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/AcervoShow')
                ->where('item.playlist_id', $playlistId)
                ->has('item.episodes', 3)
                ->where('item.episodes.0.title', 'Episódio A')
                ->where('item.episodes.1.title', 'Episódio B')
                ->where('item.episodes.2.title', 'Episódio C')
                ->where('item.videoCount', 3)
            );
    }
}
