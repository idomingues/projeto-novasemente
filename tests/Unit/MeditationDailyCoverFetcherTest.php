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
            'live.staticflickr.com/fresh/*' => Http::response($this->sampleJpegBytes(), 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $fetcher = app(MeditationDailyCoverFetcher::class);
        $url = $fetcher->resolveForDate(now());

        $this->assertStringContainsString('meditation-covers/', $url);
        $this->assertStringContainsString('.ns.jpg', $url);
        Storage::disk('public')->assertExists('meditation-covers/'.now()->format('Y').'/'.now()->format('Y-m-d').'.ns.jpg');
        $this->assertStringNotContainsString('already.jpg', $url);
    }

    public function test_normalize_cover_key_ignores_query_string(): void
    {
        $fetcher = app(MeditationDailyCoverFetcher::class);
        $a = $fetcher->normalizeCoverKey('https://images.unsplash.com/photo-abc?w=1080&q=80');
        $b = $fetcher->normalizeCoverKey('https://images.unsplash.com/photo-abc?w=400');
        $this->assertSame($a, $b);
    }

    public function test_normalize_cover_key_treats_branded_local_same_day(): void
    {
        $fetcher = app(MeditationDailyCoverFetcher::class);
        $plain = $fetcher->normalizeCoverKey('/storage/meditation-covers/2026/2026-08-07.jpg');
        $branded = $fetcher->normalizeCoverKey('/storage/meditation-covers/2026/2026-08-07.ns.jpg');
        $this->assertSame('local:2026-08-07', $plain);
        $this->assertSame($plain, $branded);
    }

    public function test_apply_brand_mark_places_logo_on_cover(): void
    {
        $logoPath = public_path('images/brand/meditation-cover-logo.png');
        $this->assertFileExists($logoPath);

        $fetcher = app(MeditationDailyCoverFetcher::class);
        $result = $fetcher->applyBrandMark($this->sampleJpegBytes(), 'image/jpeg');

        $this->assertNotNull($result);
        $this->assertSame('jpg', $result['ext']);
        $this->assertNotSame('', $result['bytes']);
        $this->assertTrue(strlen($result['bytes']) > 2_000);

        $out = imagecreatefromstring($result['bytes']);
        $this->assertNotFalse($out);
        $this->assertSame(800, imagesx($out));
        $this->assertSame(1000, imagesy($out));
    }

    private function sampleJpegBytes(): string
    {
        $cover = imagecreatetruecolor(800, 1000);
        imagefilledrectangle($cover, 0, 0, 799, 999, imagecolorallocate($cover, 40, 80, 120));
        ob_start();
        imagejpeg($cover, null, 90);

        return (string) ob_get_clean();
    }
}
