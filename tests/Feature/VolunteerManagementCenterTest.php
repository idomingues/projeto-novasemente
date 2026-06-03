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

    public function test_management_center_sidebar_counts_ignore_list_search(): void
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

        $baseline = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central'));
        $baseline->assertOk();
        $baselinePage = json_decode(json_encode($baseline->viewData('page')), true);
        $baselineAll = (int) ($baselinePage['props']['allVolunteersCount'] ?? 0);
        $baselineDept = collect($baselinePage['props']['departments'] ?? [])
            ->firstWhere('id', $ministry->id);
        $baselineDeptCount = (int) ($baselineDept['volunteerCount'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $baselineAll);
        $this->assertGreaterThanOrEqual(1, $baselineDeptCount);

        $withSearch = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => $ministry->id,
            'search' => 'zzznomatchzz',
        ]));
        $withSearch->assertOk();
        $withSearch->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->where('allVolunteersCount', $baselineAll)
            ->where('departments', function ($rows) use ($ministry, $baselineDeptCount) {
                $row = collect($rows)->firstWhere('id', $ministry->id);

                return (int) ($row['volunteerCount'] ?? 0) === $baselineDeptCount;
            })
            ->where('volunteers.total', 0));
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
            ->where('centerVinculo', 'vinculados')
            ->where('volunteers.total', fn ($deptTotal) => (int) $deptTotal <= $allCount));
    }

    public function test_management_center_separates_attached_from_forwarded_in_department(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministries = Ministry::query()->where('church_id', $church->id)->orderBy('id')->limit(2)->get();
        $this->assertGreaterThanOrEqual(2, $ministries->count());
        $ministryA = $ministries[0];
        $ministryB = $ministries[1];

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Só Encaminhado Depto',
            'email' => 'so.encaminhado.depto@example.com',
            'ministry_ids' => [$ministryA->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = \App\Models\Volunteer::query()->where('email', 'so.encaminhado.depto@example.com')->firstOrFail();

        \App\Models\VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministryB->id,
            'invited_by_user_id' => $admin->id,
            'token' => \App\Models\VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $attachedResponse = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => $ministryB->id,
        ]));
        $attachedResponse->assertOk();
        $attachedResponse->assertInertia(fn ($page) => $page
            ->where('centerVinculo', 'vinculados')
            ->where('volunteers.data', fn ($rows) => collect($rows)->doesntContain(
                fn ($row) => ($row['email'] ?? null) === 'so.encaminhado.depto@example.com',
            )));

        $forwardedResponse = $this->actingAs($admin)->get(route('ministry-lead.volunteers.central', [
            'ministerio' => $ministryB->id,
            'vinculo' => 'encaminhados',
        ]));
        $forwardedResponse->assertOk();
        $forwardedResponse->assertInertia(fn ($page) => $page
            ->where('centerVinculo', 'encaminhados')
            ->where('volunteers.data', fn ($rows) => collect($rows)->contains(
                fn ($row) => ($row['email'] ?? null) === 'so.encaminhado.depto@example.com',
            )));
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

    public function test_ministry_leader_can_view_volunteer_notes_in_management_center(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $admin = User::factory()->create();
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Voluntário Com Nota',
            'email' => 'voluntario.com.nota@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = \App\Models\Volunteer::query()->where('email', 'voluntario.com.nota@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('ministry-lead.volunteers.pipeline.notes.store', $volunteer), [
                'body' => 'Orientação interna para o líder do departamento.',
            ])
            ->assertRedirect();

        $leader = User::factory()->create([
            'church_id' => $church->id,
            'is_ministry_leader' => true,
        ]);
        $leader->assignRole(Role::firstOrCreate(['name' => 'lider_ministerio']));
        $leader->ministries()->sync([(int) $ministry->id]);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', ['ministerio' => $ministry->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MinistryLeadVolunteers/ManagementCenter')
                ->where('canViewVolunteerNotes', true)
                ->where('canPipelineMutate', true));

        $detail = $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('ministry-lead.volunteers.pipeline.detail', $volunteer))
            ->assertOk()
            ->json();

        $this->assertSame('Orientação interna para o líder do departamento.', $detail['notes'][0]['body']);
        $this->assertNull($detail['notes'][0]['destroyUrl']);

        $adminNoteId = $detail['notes'][0]['id'];

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->deleteJson(route('ministry-lead.volunteers.pipeline.notes.destroy', [$volunteer, $adminNoteId]))
            ->assertForbidden();

        $leaderNote = $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('ministry-lead.volunteers.pipeline.notes.store', $volunteer), [
                'body' => 'Nota do líder.',
            ])
            ->assertCreated()
            ->json('note');

        $this->assertSame('Nota do líder.', $leaderNote['body']);
        $this->assertNotEmpty($leaderNote['destroyUrl']);

        $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->deleteJson(route('ministry-lead.volunteers.pipeline.notes.destroy', [$volunteer, $leaderNote['id']]))
            ->assertOk();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->deleteJson(route('ministry-lead.volunteers.pipeline.notes.destroy', [$volunteer, $adminNoteId]))
            ->assertOk();

        $afterDelete = $this->actingAs($leader)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('ministry-lead.volunteers.pipeline.detail', $volunteer))
            ->assertOk()
            ->json('notes');

        $this->assertCount(0, $afterDelete);
    }
}
