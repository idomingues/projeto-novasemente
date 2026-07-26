<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Support\HomeModuleSpotlight;
use Carbon\Carbon;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HomeModuleSpotlightTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_shows_active_module_spotlight_carousel(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('moduleSpotlight.interval_seconds', 6)
                ->has('moduleSpotlight.items', 2)
                ->where('moduleSpotlight.items.0.id', 'ns_whats_2026_07')
                ->where('moduleSpotlight.items.0.route', 'mobile.ns-whats.index')
                ->where('moduleSpotlight.items.0.title', 'NS Whats')
                ->where('moduleSpotlight.items.1.id', 'enquetes_2026_07')
                ->where('moduleSpotlight.items.1.route', 'mobile.polls.index')
                ->where('moduleSpotlight.items.1.title', 'Enquetes'));
    }

    public function test_spotlight_respects_campaign_period(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $church = Church::query()->orderBy('id')->firstOrFail();

        config([
            'home_module_spotlight.campaigns' => [
                [
                    'id' => 'future_only',
                    'feature_key' => 'ns_whats',
                    'route' => 'mobile.ns-whats.index',
                    'badge' => 'Em breve',
                    'title' => 'Futuro',
                    'subtitle' => 'Ainda não',
                    'cta' => 'Abrir',
                    'starts_at' => '2099-01-01',
                    'ends_at' => '2099-12-31',
                ],
            ],
        ]);

        $this->assertNull(HomeModuleSpotlight::forChurch($church, Carbon::parse('2026-07-26')));

        config([
            'home_module_spotlight.campaigns' => [
                [
                    'id' => 'active_now',
                    'feature_key' => 'ns_whats',
                    'route' => 'mobile.ns-whats.index',
                    'badge' => 'Em destaque',
                    'title' => 'NS Whats',
                    'subtitle' => 'Agora',
                    'cta' => 'Abrir',
                    'starts_at' => '2026-07-01',
                    'ends_at' => '2026-08-31',
                ],
            ],
        ]);

        $active = HomeModuleSpotlight::forChurch($church, Carbon::parse('2026-07-26'));
        $this->assertNotNull($active);
        $this->assertCount(1, $active['items']);
        $this->assertSame('active_now', $active['items'][0]['id']);
    }

    public function test_spotlight_hidden_when_feature_disabled(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $church = Church::query()->orderBy('id')->firstOrFail();
        $church->update(['disabled_app_features' => ['ns_whats', 'polls']]);

        config([
            'home_module_spotlight.campaigns' => [
                [
                    'id' => 'ns_whats_test',
                    'feature_key' => 'ns_whats',
                    'route' => 'mobile.ns-whats.index',
                    'badge' => 'Em destaque',
                    'title' => 'NS Whats',
                    'subtitle' => 'Teste',
                    'cta' => 'Abrir',
                    'starts_at' => '2026-07-01',
                    'ends_at' => '2026-08-31',
                ],
                [
                    'id' => 'polls_test',
                    'feature_key' => 'polls',
                    'route' => 'mobile.polls.index',
                    'badge' => 'Em destaque',
                    'title' => 'Enquetes',
                    'subtitle' => 'Teste',
                    'cta' => 'Abrir',
                    'starts_at' => '2026-07-01',
                    'ends_at' => '2026-08-31',
                ],
            ],
        ]);

        $this->assertNull(HomeModuleSpotlight::forChurch($church->fresh(), Carbon::parse('2026-07-26')));
    }

    public function test_spotlight_keeps_enabled_campaign_when_sibling_disabled(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $church = Church::query()->orderBy('id')->firstOrFail();
        $church->update(['disabled_app_features' => ['ns_whats']]);

        config([
            'home_module_spotlight.interval_seconds' => 5,
            'home_module_spotlight.campaigns' => [
                [
                    'id' => 'ns_whats_test',
                    'feature_key' => 'ns_whats',
                    'route' => 'mobile.ns-whats.index',
                    'badge' => 'Em destaque',
                    'title' => 'NS Whats',
                    'subtitle' => 'Teste',
                    'cta' => 'Abrir',
                    'starts_at' => '2026-07-01',
                    'ends_at' => '2026-08-31',
                ],
                [
                    'id' => 'polls_test',
                    'feature_key' => 'polls',
                    'route' => 'mobile.polls.index',
                    'badge' => 'Em destaque',
                    'title' => 'Enquetes',
                    'subtitle' => 'Teste',
                    'cta' => 'Abrir',
                    'starts_at' => '2026-07-01',
                    'ends_at' => '2026-08-31',
                ],
            ],
        ]);

        $active = HomeModuleSpotlight::forChurch($church->fresh(), Carbon::parse('2026-07-26'));
        $this->assertNotNull($active);
        $this->assertSame(5, $active['interval_seconds']);
        $this->assertCount(1, $active['items']);
        $this->assertSame('polls_test', $active['items'][0]['id']);
    }
}
