<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\MissionVolunteerAccountResolver;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionVolunteerAccountResolverTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
    }

    public function test_links_mission_volunteer_to_user_by_unique_name_when_contact_differs(): void
    {
        $user = User::factory()->create([
            'church_id' => $this->church->id,
            'name' => 'Pamela Pereira Alves',
            'email' => 'pamelapolaka@yahoo.com.br',
            'phone' => '11983419220',
        ]);
        $user->syncVolunteerRecord();

        $phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Acolhimento',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);

        $missionVolunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Pamela Pereira Alves',
            'phone' => '11983419920',
            'email' => null,
            'lgpd_consent' => true,
        ]);

        $linked = MissionVolunteerAccountResolver::userForVolunteer($missionVolunteer);

        $this->assertNotNull($linked);
        $this->assertSame($user->id, $linked->id);
        $this->assertSame('pamelapolaka@yahoo.com.br', MissionVolunteerAccountResolver::emailForVolunteer($missionVolunteer));
    }

    public function test_links_mission_volunteer_to_user_via_volunteer_profile_email(): void
    {
        $user = User::factory()->create([
            'church_id' => $this->church->id,
            'name' => 'Maria App',
            'email' => 'maria.app@example.com',
            'phone' => '11988887777',
        ]);

        Volunteer::query()->create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'active' => true,
            'app_access_only' => true,
        ]);

        $phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Onboarding',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);

        $missionVolunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Maria Cadastro Missão',
            'phone' => '11977776666',
            'email' => 'maria.app@example.com',
            'lgpd_consent' => true,
        ]);

        $linked = MissionVolunteerAccountResolver::userForVolunteer($missionVolunteer);

        $this->assertNotNull($linked);
        $this->assertSame($user->id, $linked->id);
    }

    public function test_mission_users_index_shows_linked_app_account(): void
    {
        $admin = User::factory()->create(['church_id' => $this->church->id]);
        $admin->assignRole('admin');

        $user = User::factory()->create([
            'church_id' => $this->church->id,
            'name' => 'Pamela Pereira Alves',
            'email' => 'pamelapolaka@yahoo.com.br',
            'phone' => '11983419220',
        ]);
        $user->syncVolunteerRecord();

        $phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Acolhimento',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);

        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Pamela Pereira Alves',
            'phone' => '11983419920',
            'email' => null,
            'lgpd_consent' => true,
        ]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($admin)
            ->get(route('mission.users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mission/Users')
                ->where('users.0.name', 'Pamela Pereira Alves')
                ->where('users.0.email', 'pamelapolaka@yahoo.com.br')
                ->where('users.0.has_app_account', true)
                ->where('users.0.id', $user->id));
    }
}
