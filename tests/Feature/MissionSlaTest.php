<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\MissionVolunteerPhaseHistory;
use App\Support\MissionSla;
use Database\Seeders\ChurchSeeder;
use Illuminate\Support\Carbon;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionSlaTest extends TestCase
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
            'sla_days' => 5,
        ]);
    }

    public function test_phase_crud_requires_sla_days(): void
    {
        $session = ['working_church_id' => $this->church->id];

        $this->withSession($session)->actingAs($this->admin)
            ->post(route('mission.phases.store'), ['name' => 'Nova fase'])
            ->assertSessionHasErrors('sla_days');

        $this->withSession($session)->actingAs($this->admin)
            ->post(route('mission.phases.store'), ['name' => 'Nova fase', 'sla_days' => 10])
            ->assertRedirect(route('mission.index'));

        $this->assertDatabaseHas('mission_phases', [
            'church_id' => $this->church->id,
            'name' => 'Nova fase',
            'sla_days' => 10,
        ]);
    }

    public function test_index_marks_overdue_volunteers(): void
    {
        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now()->subDays(10),
            'full_name' => 'Atrasado Silva',
            'phone' => '11999990001',
            'lgpd_consent' => true,
        ]);

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mission/Index')
            ->where('overdueTotal', 1)
            ->has('volunteers.data', 1)
            ->where('volunteers.data.0.isOverdue', true)
            ->where('volunteers.data.0.daysOverdue', 5));
    }

    public function test_mission_team_member_can_only_update_own_phase(): void
    {
        $otherPhase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Em contato',
            'sort_order' => 20,
            'sla_days' => 7,
        ]);

        $operator = User::factory()->create([
            'church_id' => $this->church->id,
            'is_mission_team' => true,
        ]);
        $operator->givePermissionTo('mission.view');
        $operator->missionPhases()->sync([$this->phase->id]);

        $inMyPhase = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Na minha fase',
            'phone' => '11999990002',
            'lgpd_consent' => true,
        ]);

        $otherVolunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $otherPhase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Outra fase',
            'phone' => '11999990003',
            'lgpd_consent' => true,
        ]);

        $session = ['working_church_id' => $this->church->id];

        $this->withSession($session)->actingAs($operator)
            ->patch(route('mission.volunteers.phase', $inMyPhase), [
                'mission_phase_id' => $otherPhase->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->withSession($session)->actingAs($operator)
            ->patch(route('mission.volunteers.phase', $otherVolunteer), [
                'mission_phase_id' => $this->phase->id,
            ])
            ->assertForbidden();
    }

    public function test_admin_assigns_phase_leader_via_users_modal(): void
    {
        $leader = User::factory()->create(['church_id' => $this->church->id]);
        $leader->givePermissionTo('mission.view');

        $this->withSession(['working_church_id' => $this->church->id])->actingAs($this->admin)
            ->patch(route('mission.users.update', $leader), [
                'is_phase_leader' => true,
                'mission_phase_ids' => [$this->phase->id],
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $leader->refresh();
        $this->assertTrue($leader->is_mission_team);
        $this->assertSame([$this->phase->id], $leader->missionPhases()->pluck('id')->all());
    }

    public function test_mission_users_index_lists_viewers(): void
    {
        $viewer = User::factory()->create(['church_id' => $this->church->id, 'name' => 'Ana Missão']);
        $viewer->givePermissionTo('mission.view');

        $response = $this->withSession(['working_church_id' => $this->church->id])->actingAs($this->admin)
            ->get(route('mission.users.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('Mission/Users')->has('users'));
        $names = collect($response->original->getData()['page']['props']['users'])->pluck('name')->all();
        $this->assertContains('Ana Missão', $names);
    }

    public function test_admin_can_reorder_phases_by_sort_order(): void
    {
        $phaseB = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Em contato',
            'sort_order' => 20,
            'sla_days' => 14,
        ]);

        $session = ['working_church_id' => $this->church->id];

        $this->withSession($session)->actingAs($this->admin)
            ->put(route('mission.phases.update', $this->phase), [
                'name' => 'Interessado',
                'sort_order' => 20,
                'sla_days' => 5,
            ])
            ->assertRedirect();

        $this->withSession($session)->actingAs($this->admin)
            ->put(route('mission.phases.update', $phaseB), [
                'name' => 'Em contato',
                'sort_order' => 10,
                'sla_days' => 14,
            ])
            ->assertRedirect();

        $first = MissionPhase::query()
            ->where('church_id', $this->church->id)
            ->orderBy('sort_order')
            ->first();

        $this->assertSame($phaseB->id, $first?->id);
    }

    public function test_detail_includes_notes_and_phase_history(): void
    {
        $volunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Com histórico',
            'phone' => '11999990099',
            'lgpd_consent' => true,
        ]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->post(route('mission.volunteers.notes.store', $volunteer), ['body' => 'Primeiro contato realizado.'])
            ->assertRedirect();

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->getJson(route('mission.volunteers.detail', $volunteer));

        $response->assertOk();
        $response->assertJsonPath('notes.0.body', 'Primeiro contato realizado.');
        $this->assertDatabaseHas('mission_volunteer_notes', [
            'mission_volunteer_id' => $volunteer->id,
            'body' => 'Primeiro contato realizado.',
        ]);
    }

    public function test_sla_counts_from_phase_history_entry_not_original_created_at(): void
    {
        $volunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now()->subDays(20),
            'full_name' => 'Histórico SLA',
            'phone' => '11999990088',
            'lgpd_consent' => true,
        ]);

        MissionVolunteerPhaseHistory::query()->create([
            'church_id' => $this->church->id,
            'mission_volunteer_id' => $volunteer->id,
            'changed_by_user_id' => $this->admin->id,
            'from_phase_id' => null,
            'to_phase_id' => $this->phase->id,
            'from_phase_name' => null,
            'to_phase_name' => $this->phase->name,
            'created_at' => Carbon::now()->subDays(3),
        ]);

        MissionSla::clearPhaseEntryCache();
        MissionSla::warmPhaseEntryCache([$volunteer]);
        $metrics = MissionSla::metricsForVolunteer($volunteer->load('phase'));

        $this->assertSame(3, $metrics['daysInPhase']);
        $this->assertFalse($metrics['isOverdue']);
    }

    public function test_phase_leader_requires_at_least_one_phase(): void
    {
        $leader = User::factory()->create(['church_id' => $this->church->id]);
        $leader->givePermissionTo('mission.view');

        $this->withSession(['working_church_id' => $this->church->id])->actingAs($this->admin)
            ->patch(route('mission.users.update', $leader), [
                'is_phase_leader' => true,
                'mission_phase_ids' => [],
            ])
            ->assertRedirect()
            ->assertSessionHas('error');
    }
}
