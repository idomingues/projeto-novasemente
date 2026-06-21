<?php

namespace Tests\Feature;

use App\Models\PageViewDailyStat;
use App\Services\PageViewAnalytics;
use App\Support\PageViewShellRoutes;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageViewAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_ranking_excludes_navigation_shells_and_is_flat(): void
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
        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'mobile.more',
            'visited_on' => now()->startOfMonth()->toDateString(),
            'views' => 3,
        ]);

        $result = PageViewAnalytics::monthlyForChurch($churchId, $month);

        $this->assertTrue($result['enabled']);
        $this->assertSame(5, $result['totalViews']);
        $this->assertCount(1, $result['pages']);
        $this->assertSame('mobile.biblioteca', $result['pages'][0]['routeName']);
        $this->assertSame(5, $result['pages'][0]['views']);
    }

    public function test_shell_routes_list_covers_main_navigation_hubs(): void
    {
        $this->assertTrue(PageViewShellRoutes::isExcluded('mobile.home'));
        $this->assertTrue(PageViewShellRoutes::isExcluded('mobile.more'));
        $this->assertTrue(PageViewShellRoutes::isExcluded('dashboard'));
        $this->assertTrue(PageViewShellRoutes::isExcluded('notifications.feed'));
        $this->assertTrue(PageViewShellRoutes::isExcluded('mobile.news'));
        $this->assertTrue(PageViewShellRoutes::isExcluded('mobile.culto'));
        $this->assertFalse(PageViewShellRoutes::isExcluded('mobile.biblioteca'));
        $this->assertFalse(PageViewShellRoutes::isExcluded('mobile.culto.show'));
    }

    public function test_top_pages_for_dashboard_uses_portuguese_labels_and_excludes_shells(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);
        $churchId = 1;
        $day = now()->toDateString();

        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'mobile.home',
            'visited_on' => $day,
            'views' => 100,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'ministry-lead.volunteers.index',
            'visited_on' => $day,
            'views' => 50,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $churchId,
            'route_name' => 'notifications.feed',
            'visited_on' => $day,
            'views' => 40,
        ]);

        $top = PageViewAnalytics::topPagesForChurch($churchId, 14, 12);

        $this->assertCount(1, $top);
        $this->assertSame('ministry-lead.volunteers.index', $top[0]['routeName']);
        $this->assertSame('Voluntários', $top[0]['label']);
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
                ->has('pageViews.pages'));
    }
}
