<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SabbathHomeBannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'sabbath.latitude' => -23.574389,
            'sabbath.longitude' => -46.644722,
            'sabbath.timezone' => 'America/Sao_Paulo',
        ]);
    }

    public function test_home_has_no_sabbath_banner_on_weekday(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-03 10:00:00', 'America/Sao_Paulo'));

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('sabbathBanner', null)
            );
    }

    public function test_home_shows_friday_sabbath_banner_with_sunset_from_api(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-05 10:00:00', 'America/Sao_Paulo'));
        Cache::flush();

        Http::fake([
            'api.sunrise-sunset.org/*' => Http::response([
                'results' => [
                    'sunset' => '2026-06-05T17:32:00-03:00',
                ],
                'status' => 'OK',
                'tzid' => 'America/Sao_Paulo',
            ], 200),
        ]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('sabbathBanner', fn (Assert $banner) => $banner
                    ->where('variant', 'friday')
                    ->where('title', 'Sábado começa em')
                    ->where('sunset_time', '17:32')
                    ->where('day_label', 'Hoje, sexta-feira')
                    ->etc()
                )
            );
    }

    public function test_home_shows_saturday_sabbath_banner_with_sunset_from_api(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-06 10:00:00', 'America/Sao_Paulo'));
        Cache::flush();

        Http::fake([
            'api.sunrise-sunset.org/*' => Http::response([
                'results' => [
                    'sunset' => '2026-06-06T17:28:00-03:00',
                ],
                'status' => 'OK',
                'tzid' => 'America/Sao_Paulo',
            ], 200),
        ]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('sabbathBanner', fn (Assert $banner) => $banner
                    ->where('variant', 'saturday')
                    ->where('title', 'Sábado sagrado')
                    ->where('sunset_time', '17:28')
                    ->where('day_label', 'Hoje, sábado')
                    ->etc()
                )
            );
    }

    public function test_home_hides_sabbath_banner_after_saturday_sunset(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-06 18:30:00', 'America/Sao_Paulo'));
        Cache::flush();

        Http::fake([
            'api.sunrise-sunset.org/*' => Http::response([
                'results' => [
                    'sunset' => '2026-06-06T17:28:00-03:00',
                ],
                'status' => 'OK',
                'tzid' => 'America/Sao_Paulo',
            ], 200),
        ]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->where('sabbathBanner', null)
            );
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }
}
