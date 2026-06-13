<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionEvent;
use App\Support\NovaSementeMissionCalendar2026;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionCalendar2026InstallerTest extends TestCase
{
    use RefreshDatabase;

    public function test_mission_seed_calendar_command_installs_events(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->artisan('mission:seed-calendar-2026', ['--church' => $church->slug ?? 'nova-semente'])
            ->assertSuccessful();

        $this->assertSame(
            count(NovaSementeMissionCalendar2026::events()),
            MissionEvent::query()->where('church_id', $church->id)->missionCalendar2026()->count(),
        );
    }

    public function test_mobile_mission_events_lists_calendar_after_install(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->artisan('mission:seed-calendar-2026')->assertSuccessful();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.events'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionEvents')
                ->has('events', count(NovaSementeMissionCalendar2026::events())));
    }
}
