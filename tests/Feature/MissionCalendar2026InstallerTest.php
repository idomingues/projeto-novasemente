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

    public function test_installer_updates_mission_day_description_from_seed_package(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Mission Day',
            'description' => null,
            'starts_at' => '2026-06-14 00:00:00',
            'all_day' => true,
        ]);

        $this->artisan('mission:seed-calendar-2026')->assertSuccessful();

        $this->assertDatabaseHas('mission_events', [
            'church_id' => $church->id,
            'title' => 'Mission Day',
        ]);

        $missionDay = MissionEvent::query()
            ->where('church_id', $church->id)
            ->whereDate('starts_at', '2026-06-14')
            ->firstOrFail();

        $this->assertStringContainsString('programação especial', strtolower((string) $missionDay->description));
        $this->assertSame('Rua Cubatão, 48 — Paraíso, São Paulo — SP', $missionDay->location);
    }

    public function test_installer_does_not_wipe_custom_event_description_when_seed_has_none(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionEvent::query()->create([
            'church_id' => $church->id,
            'title' => 'Celebration Day',
            'description' => 'Programação especial com todas as informações para o público.',
            'starts_at' => '2026-12-06 00:00:00',
            'all_day' => true,
        ]);

        $this->artisan('mission:seed-calendar-2026')->assertSuccessful();

        $this->assertDatabaseHas('mission_events', [
            'church_id' => $church->id,
            'title' => 'Celebration Day',
            'description' => 'Programação especial com todas as informações para o público.',
        ]);
    }
}
