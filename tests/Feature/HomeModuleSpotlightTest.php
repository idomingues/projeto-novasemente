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

    public function test_home_shows_active_module_spotlight(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $this->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('moduleSpotlight.id', 'ns_whats_2026_07')
                ->where('moduleSpotlight.route', 'mobile.ns-whats.index')
                ->where('moduleSpotlight.title', 'NS Whats'));
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
        $this->assertSame('active_now', $active['id']);
    }

    public function test_spotlight_hidden_when_feature_disabled(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $church = Church::query()->orderBy('id')->firstOrFail();
        $church->update(['disabled_app_features' => ['ns_whats']]);

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
            ],
        ]);

        $this->assertNull(HomeModuleSpotlight::forChurch($church->fresh(), Carbon::parse('2026-07-26')));
    }
}
