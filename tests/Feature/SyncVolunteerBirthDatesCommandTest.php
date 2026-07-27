<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SyncVolunteerBirthDatesCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_fills_volunteer_from_linked_user(): void
    {
        $this->seed();

        $user = User::factory()->create([
            'birth_date' => '1985-03-10',
        ]);
        $volunteer = Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => 'Sem Data Vol',
            'email' => 'sem.data.vol@example.com',
            'active' => true,
            'birth_date' => null,
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertSame('1985-03-10', $volunteer->fresh()->birth_date?->toDateString());
    }

    public function test_fills_user_from_volunteer(): void
    {
        $this->seed();

        $user = User::factory()->create([
            'birth_date' => null,
        ]);
        $volunteer = Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => 'Com Data Vol',
            'email' => 'com.data.vol@example.com',
            'active' => true,
            'birth_date' => '1977-09-10',
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertSame('1977-09-10', $user->fresh()->birth_date?->toDateString());
        $this->assertSame('1977-09-10', $volunteer->fresh()->birth_date?->toDateString());
    }

    public function test_fills_volunteer_from_mission_by_email(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        MissionVolunteer::query()->create([
            'church_id' => $church->id,
            'full_name' => 'Missão Match',
            'email' => 'missao.match@example.com',
            'birth_date' => '1991-07-22',
        ]);

        $volunteer = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Missão Match',
            'email' => 'Missao.Match@example.com',
            'active' => true,
            'birth_date' => null,
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertSame('1991-07-22', $volunteer->fresh()->birth_date?->toDateString());
    }

    public function test_divergence_prefers_volunteer_date(): void
    {
        $this->seed();

        $user = User::factory()->create([
            'birth_date' => '1999-06-14',
        ]);
        $volunteer = Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => 'Divergente',
            'email' => 'divergente@example.com',
            'active' => true,
            'birth_date' => '2000-06-14',
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertSame('2000-06-14', $volunteer->fresh()->birth_date?->toDateString());
        $this->assertSame('2000-06-14', $user->fresh()->birth_date?->toDateString());
    }

    public function test_scrub_invalid_dates_and_does_not_copy_untrusted(): void
    {
        $this->seed();

        $user = User::factory()->create([
            'birth_date' => null,
        ]);
        $volunteer = Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => 'Data Futura',
            'email' => 'data.futura@example.com',
            'active' => true,
            'birth_date' => now()->subYears(2)->toDateString(),
        ]);

        $orphanUser = User::factory()->create([
            'birth_date' => now()->subMonths(3)->toDateString(),
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertNull($volunteer->fresh()->birth_date);
        $this->assertNull($user->fresh()->birth_date);
        $this->assertNull($orphanUser->fresh()->birth_date);
    }

    public function test_does_not_fill_from_untrusted_mission_date(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        MissionVolunteer::query()->create([
            'church_id' => $church->id,
            'full_name' => 'Missão Ruim',
            'email' => 'missao.ruim@example.com',
            'birth_date' => now()->subYears(3)->toDateString(),
        ]);

        $volunteer = Volunteer::query()->create([
            'user_id' => null,
            'name' => 'Missão Ruim',
            'email' => 'missao.ruim@example.com',
            'active' => true,
            'birth_date' => null,
        ]);

        $this->artisan('volunteers:sync-birth-dates')->assertSuccessful();

        $this->assertNull($volunteer->fresh()->birth_date);
    }

    public function test_dry_run_does_not_persist(): void
    {
        $this->seed();

        $user = User::factory()->create([
            'birth_date' => '1988-01-01',
        ]);
        $volunteer = Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => 'Dry Run',
            'email' => 'dry.run@example.com',
            'active' => true,
            'birth_date' => null,
        ]);

        $this->artisan('volunteers:sync-birth-dates', ['--dry-run' => true])->assertSuccessful();

        $this->assertNull($volunteer->fresh()->birth_date);
    }
}
