<?php

namespace Tests\Feature;

use App\Models\PageViewDailyStat;
use App\Services\PageViewAnalytics;
use App\Support\PageViewRouteGrouper;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageViewAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_grouped_aggregates_routes_by_group(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $churchId = 1;
        $month = now()->format('Y-m');

        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'mobile.home',
            'visited_on' => now()->startOfMonth()->toDateString(),
            'views' => 10,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'mobile.biblioteca',
            'visited_on' => now()->startOfMonth()->toDateString(),
            'views' => 5,
        ]);

        $result = PageViewAnalytics::monthlyGroupedForChurch($churchId, $month);

        $this->assertTrue($result['enabled']);
        $this->assertSame(15, $result['totalViews']);
        $this->assertNotEmpty($result['groups']);

        $navGroup = collect($result['groups'])->firstWhere('groupLabel', 'Navegação principal (app)');
        $this->assertNotNull($navGroup);
        $this->assertSame(10, $navGroup['totalViews']);

        $libGroup = collect($result['groups'])->firstWhere('groupLabel', 'Biblioteca e estudo');
        $this->assertNotNull($libGroup);
        $this->assertSame(5, $libGroup['totalViews']);
    }

    public function test_route_grouper_assigns_known_areas(): void
    {
        $this->assertSame('Navegação principal (app)', PageViewRouteGrouper::group('mobile.home'));
        $this->assertSame('Biblioteca e estudo', PageViewRouteGrouper::group('mobile.biblioteca.show'));
        $this->assertSame('Painel administrativo', PageViewRouteGrouper::group('operations.index'));
    }

    public function test_operations_pages_tab_is_accessible_for_super_admin(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $admin = \App\Models\User::factory()->create();
        $admin->syncRoles(['super_admin']);

        $this->actingAs($admin)
            ->get(route('operations.index', ['tab' => 'pages']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Operations/Index')
                ->where('activeTab', 'pages')
                ->has('pageViews.groups'));
    }
}
