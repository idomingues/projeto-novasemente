<?php

namespace Tests\Unit;

use App\Models\Church;
use App\Models\News;
use App\Services\MeditationDailyCoverFetcher;
use App\Support\MeditationDailyFeed;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MeditationDailyCoverFetcherTest extends TestCase
{
    use RefreshDatabase;

    public function test_picks_unused_openverse_image_and_stores_locally(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        Storage::fake('public');

        News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_NEWS,
            'title' => 'Já usado',
            'slug' => MeditationDailyFeed::SLUG_PREFIX.'2026-08-01',
            'content_type' => News::TYPE_IMAGE,
            'excerpt' => 'x',
            'body' => 'x',
            'image_url' => 'https://live.staticflickr.com/used/already.jpg',
            'published_at' => now()->subDay(),
            'is_active' => true,
        ]);

        Http::fake([
            'api.openverse.org/*' => Http::response([
                'results' => [
                    ['url' => 'https://live.staticflickr.com/used/already.jpg'],
                    ['url' => 'https://live.staticflickr.com/fresh/sunrise-new.jpg'],
                ],
            ], 200),
            'live.staticflickr.com/fresh/*' => Http::response(str_repeat('JPEG_FAKE_BYTES_', 200), 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $fetcher = app(MeditationDailyCoverFetcher::class);
        $url = $fetcher->resolveForDate(now());

        $this->assertStringContainsString('meditation-covers/', $url);
        Storage::disk('public')->assertExists('meditation-covers/'.now()->format('Y').'/'.now()->format('Y-m-d').'.jpg');
        $this->assertStringNotContainsString('already.jpg', $url);
    }

    public function test_normalize_cover_key_ignores_query_string(): void
    {
        $fetcher = app(MeditationDailyCoverFetcher::class);
        $a = $fetcher->normalizeCoverKey('https://images.unsplash.com/photo-abc?w=1080&q=80');
        $b = $fetcher->normalizeCoverKey('https://images.unsplash.com/photo-abc?w=400');
        $this->assertSame($a, $b);
    }
}
