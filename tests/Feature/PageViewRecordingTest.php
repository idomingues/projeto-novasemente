<?php

namespace Tests\Feature;

use App\Models\PageViewDailyStat;
use App\Models\User;
use App\Models\UserFeatureDailyReach;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PageViewRecordingTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_request_increments_daily_page_view_stat_after_response(): void
    {
        $this->seed();

        $before = PageViewDailyStat::query()->count();
        $this->get(route('mobile.home', absolute: false))->assertOk();
        $this->assertGreaterThan($before, PageViewDailyStat::query()->count());

        $row = PageViewDailyStat::query()->where('route_name', 'mobile.home')->first();
        $this->assertNotNull($row);
        $this->assertGreaterThanOrEqual(1, (int) $row->views);
    }

    public function test_ignored_route_does_not_record_page_view(): void
    {
        $this->seed();

        $before = PageViewDailyStat::query()->count();
        $this->get(route('favicon', absolute: false));
        $this->assertSame($before, PageViewDailyStat::query()->count());
    }

    public function test_authenticated_user_daily_reach_is_at_most_once_per_route_per_day(): void
    {
        $this->seed();

        $user = User::query()->where('email', 'ivan@iresult.com.br')->first();
        $this->assertNotNull($user);

        $reachBefore = UserFeatureDailyReach::query()->count();
        $this->actingAs($user)
            ->get(route('mobile.home', absolute: false))
            ->assertOk();
        $this->actingAs($user)
            ->get(route('mobile.home', absolute: false))
            ->assertOk();

        $this->assertSame($reachBefore + 1, UserFeatureDailyReach::query()->count());
        $this->assertSame(1, UserFeatureDailyReach::query()->where('user_id', $user->id)->where('route_name', 'mobile.home')->count());

        $agg = PageViewDailyStat::query()->where('route_name', 'mobile.home')->first();
        $this->assertNotNull($agg);
        $this->assertGreaterThanOrEqual(2, (int) $agg->views);
    }
}
