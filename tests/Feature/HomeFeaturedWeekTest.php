<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\PageViewDailyStat;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeFeaturedWeekTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_featured_week_falls_back_to_curated_when_no_stats(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'member@example.com',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('featuredWeek.items', 5)
                ->where('featuredWeek.items.0.source', 'curated')
                ->where('featuredWeek.items.0.label', 'Lição')
                ->where('featuredWeek.items.1.label', 'Bíblia')
                ->where('featuredWeek.items.2.label', 'Culto'));
    }

    public function test_home_featured_week_prefers_analytics_ranking(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'member@example.com',
        ]);

        PageViewDailyStat::query()->create([
            'church_id' => $church->id,
            'route_name' => 'mobile.events',
            'visited_on' => now()->toDateString(),
            'views' => 40,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $church->id,
            'route_name' => 'settings.index',
            'visited_on' => now()->toDateString(),
            'views' => 999,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $church->id,
            'route_name' => 'ministry-lead.volunteers.index',
            'visited_on' => now()->toDateString(),
            'views' => 500,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $church->id,
            'route_name' => 'mobile.musica',
            'visited_on' => now()->toDateString(),
            'views' => 25,
        ]);
        PageViewDailyStat::query()->create([
            'church_id' => $church->id,
            'route_name' => 'mobile.beliefs',
            'visited_on' => now()->toDateString(),
            'views' => 10,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/Home')
                ->has('featuredWeek.items', 6)
                ->where('featuredWeek.items.0.route', 'mobile.events')
                ->where('featuredWeek.items.0.source', 'analytics')
                ->where('featuredWeek.items.1.route', 'mobile.musica')
                ->where('featuredWeek.items.1.source', 'analytics')
                ->where('featuredWeek.items.2.route', 'mobile.beliefs')
                ->where('featuredWeek.items.2.source', 'analytics'));
    }
}
