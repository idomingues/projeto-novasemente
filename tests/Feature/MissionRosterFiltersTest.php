<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionRosterFiltersTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    private MissionPhase $phase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');

        $this->phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Interessado',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);
    }

    public function test_index_filters_volunteers_with_email_only(): void
    {
        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Com Email',
            'phone' => '11999990001',
            'email' => 'com@example.com',
            'lgpd_consent' => true,
        ]);

        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Sem Email',
            'phone' => '11999990002',
            'email' => null,
            'lgpd_consent' => true,
        ]);

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.index', ['has_email' => '1']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mission/Index')
            ->where('filteredTotal', 1)
            ->has('volunteers.data', 1)
            ->where('volunteers.data.0.fullName', 'Com Email'));
    }

    public function test_index_sorts_by_created_at_desc(): void
    {
        $older = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Antigo',
            'phone' => '11999990001',
            'lgpd_consent' => true,
        ]);
        $older->forceFill(['created_at' => now()->subDays(5), 'updated_at' => now()->subDays(5)])->save();

        $newer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Recente',
            'phone' => '11999990002',
            'lgpd_consent' => true,
        ]);
        $newer->forceFill(['created_at' => now()->subDay(), 'updated_at' => now()->subDay()])->save();

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.index', ['sort' => 'created_at', 'sort_dir' => 'desc']));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('volunteers.data.0.fullName', 'Recente')
            ->where('volunteers.data.1.fullName', 'Antigo'));
    }
}
