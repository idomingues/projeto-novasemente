<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerManagementCenterTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_open_volunteer_management_center(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Central Gestão',
            'email' => 'central.gestao@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $response = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => $ministry->id,
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->has('departments')
            ->where('departments', fn ($rows) => collect($rows)->contains(
                fn ($row) => (int) ($row['id'] ?? 0) === (int) $ministry->id
                    && is_int($row['volunteerCount'] ?? null)
                    && (int) $row['volunteerCount'] >= 1,
            ))
            ->has('volunteers.data')
            ->has('boardFilters')
            ->where('selectedMinistryId', $ministry->id));
    }

    public function test_management_center_lists_volunteer_without_department(): void
    {
        $admin = $this->actingAsAdmin();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Sem Depto',
            'email' => 'sem.depto@example.com',
            'ministry_ids' => [],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $response = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => 'none',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->where('selectedMinistryId', 0)
            ->where('volunteers.data', fn ($rows) => collect($rows)->contains(
                fn ($row) => ($row['email'] ?? null) === 'sem.depto@example.com',
            )));
    }

    public function test_management_center_can_group_by_phase(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fase Treino',
            'email' => 'fase.treino@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $response = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'agrupar' => 'fase',
            'fase' => 'attached',
        ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->where('groupBy', 'fase')
            ->where('selectedPhaseKey', 'attached')
            ->has('phases')
            ->where('volunteers.data', fn ($rows) => collect($rows)->contains(
                fn ($row) => ($row['email'] ?? null) === 'fase.treino@example.com',
            )));
    }

    public function test_management_center_todos_count_stays_total_when_department_selected(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministryA = Ministry::query()->where('church_id', $church->id)->orderBy('id')->firstOrFail();

        $allResponse = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central'));
        $allResponse->assertOk();
        $allPage = json_decode(json_encode($allResponse->viewData('page')), true);
        $allCount = (int) ($allPage['props']['allVolunteersCount'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $allCount);

        $filteredResponse = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => $ministryA->id,
        ]));

        $filteredResponse->assertOk();
        $filteredResponse->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->where('allVolunteersCount', $allCount)
            ->where('volunteers.total', fn ($deptTotal) => (int) $deptTotal <= $allCount));
    }

    public function test_admin_can_open_pedidos_page(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.pedidos'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MinistryLeadVolunteers/Pedidos')
                ->has('volunteerRequestRows')
                ->has('centralUrl'));
    }
}
