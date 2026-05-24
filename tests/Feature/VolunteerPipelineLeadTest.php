<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerPipelineLeadTest extends TestCase
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

    public function test_admin_can_update_ministry_leader_status_from_pipeline(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Status Pipeline',
            'email' => 'status.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = Volunteer::query()->where('email', 'status.pipeline@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'training',
                'leader_note' => '',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->first();

        $this->assertNotNull($invitation);
        $this->assertSame('training', $invitation->leader_status);

        $this->assertDatabaseHas('volunteer_ministry_invitation_status_histories', [
            'invitation_id' => $invitation->id,
            'to_status' => 'training',
        ]);
    }

    public function test_pipeline_detail_includes_editable_status_sections_for_admin(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Detalhe Pipeline',
            'email' => 'detalhe.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'detalhe.pipeline@example.com')->firstOrFail();
        $this->assertNotNull($volunteer->user_id);
        $user = User::query()->findOrFail($volunteer->user_id);
        $user->forceFill(['photo_url' => 'https://example.test/media/users/photos/ficha.jpg'])->save();
        $volunteer->forceFill([
            'phone' => '11988887777',
            'gifts_to_develop' => 'Organização',
            'professional_area' => 'Educação',
        ])->save();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => 'active',
            'leader_status_set_by_user_id' => $admin->id,
            'leader_status_set_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson(
            route('ministry-lead.volunteers.pipeline.detail', $volunteer),
        );

        $response->assertOk();
        $stageNames = collect($response->json('stages'))->pluck('name')->map(fn ($n) => mb_strtolower(trim((string) $n)))->all();
        $this->assertContains('interessado', $stageNames);
        $this->assertContains('encaminhado', $stageNames);
        $this->assertContains('finalizado', $stageNames);
        $this->assertNotContains('em análise', $stageNames);
        $this->assertNotContains('recusado pelo voluntário', $stageNames);
        $this->assertNotContains('recusado pelo líder', $stageNames);
        $response->assertJsonPath('volunteer.photo_url', 'https://example.test/media/users/photos/ficha.jpg');
        $response->assertJsonPath('volunteer.phone', '11988887777');
        $response->assertJsonPath('volunteer.gifts_to_develop', 'Organização');
        $sections = $response->json('statusHistoryByMinistry');
        $this->assertIsArray($sections);
        $this->assertNotEmpty($sections);

        $section = collect($sections)->firstWhere('ministryId', $ministry->id);
        $this->assertNotNull($section);
        $this->assertTrue($section['canEdit']);
        $this->assertNotEmpty($section['updateLeaderStatusUrl']);
        $response->assertJsonPath('updatePasswordUrl', route('ministry-lead.volunteers.pipeline.password', $volunteer));
    }

    public function test_pipeline_admin_can_update_volunteer_password_from_ficha(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Senha Pipeline',
            'email' => 'senha.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'senha.pipeline@example.com')->firstOrFail();
        $userId = (int) $volunteer->user_id;

        $this->actingAs($admin)
            ->from(route('ministry-lead.volunteers.index'))
            ->patch(route('ministry-lead.volunteers.pipeline.password', $volunteer), [
                'app_password' => 'NovaSenha456',
                'app_password_confirmation' => 'NovaSenha456',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('NovaSenha456', User::query()->findOrFail($userId)->password));
    }

    public function test_denied_leader_status_requires_note(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Recusa Pipeline',
            'email' => 'recusa.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'recusa.pipeline@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'denied',
                'leader_note' => 'ok',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasErrors(['leader_note']);

        $this->assertSame(
            0,
            VolunteerMinistryInvitationStatusHistory::query()
                ->where('volunteer_id', $volunteer->id)
                ->where('ministry_id', $ministry->id)
                ->count(),
        );
    }

    public function test_admin_can_set_reviewing_leader_status_from_pipeline(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Em Análise Pipeline',
            'email' => 'em.analise.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = Volunteer::query()->where('email', 'em.analise.pipeline@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'reviewing',
                'leader_note' => '',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->firstOrFail();

        $this->assertSame('reviewing', $invitation->leader_status);
    }

    public function test_admin_can_clear_ministry_leader_status_from_pipeline(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Limpar Status Pipeline',
            'email' => 'limpar.status.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = Volunteer::query()->where('email', 'limpar.status.pipeline@example.com')->firstOrFail();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => 'active',
        ]);

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => '',
                'leader_note' => '',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->firstOrFail();

        $this->assertNull($invitation->leader_status);

        $this->assertDatabaseHas('volunteer_ministry_invitation_status_histories', [
            'invitation_id' => $invitation->id,
            'from_status' => 'active',
            'to_status' => null,
        ]);
    }

    public function test_staff_volunteer_requests_index_redirects_to_pipeline_pedidos_tab(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('volunteer-requests.staff.index'))
            ->assertRedirect(route('ministry-lead.volunteers.index', ['secao' => 'pedidos']));
    }

    public function test_pipeline_index_includes_volunteer_request_props_for_admin(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.index', ['secao' => 'pedidos']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MinistryLeadVolunteers/Pipeline')
                ->where('secao', 'pedidos')
                ->where('canManageVolunteerRequests', true)
                ->has('volunteerRequestRows')
                ->has('volunteerRequestMinistries')
                ->has('volunteerRequestStoreUrl')
                ->has('volunteersForAttach')
                ->has('attachVolunteerPickerUrl'));
    }

    public function test_pipeline_pedidos_tab_redirects_without_solicitations_manage(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $user->givePermissionTo('volunteers.view');

        $church = Church::query()->firstOrFail();

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.index', ['secao' => 'pedidos']))
            ->assertRedirect(route('ministry-lead.volunteers.index', ['secao' => 'quadro']));
    }

    public function test_admin_workflow_stage_is_empty_by_default_even_when_pipeline_stage_is_encaminhado(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fase Principal Vazia',
            'email' => 'fase.principal.vazia@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'fase.principal.vazia@example.com')->firstOrFail();

        \App\Support\VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $church->id, 'encaminhado');

        $response = $this->actingAs($admin)->getJson(
            route('ministry-lead.volunteers.pipeline.detail', $volunteer),
        );

        $response->assertOk();
        $response->assertJsonPath('pipeline.stageName', 'Encaminhado');
        $response->assertJsonPath('pipeline.adminWorkflowStageId', null);
    }

    public function test_admin_can_set_and_clear_admin_workflow_stage(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fase Principal CRUD',
            'email' => 'fase.principal.crud@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'fase.principal.crud@example.com')->firstOrFail();

        $finalizadoId = \App\Models\VolunteerPipelineStage::query()
            ->where('church_id', $church->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['finalizado'])
            ->value('id');

        $this->assertNotNull($finalizadoId);

        $this->actingAs($admin)
            ->patch(route('ministry-lead.volunteers.pipeline.stage', $volunteer), [
                'stage_id' => (int) $finalizadoId,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $pipe = \App\Models\VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $church->id)
            ->firstOrFail();

        $this->assertSame((int) $finalizadoId, (int) $pipe->admin_workflow_stage_id);
        $this->assertSame((int) $finalizadoId, (int) $pipe->stage_id);

        $this->actingAs($admin)
            ->patch(route('ministry-lead.volunteers.pipeline.stage', $volunteer), [
                'stage_id' => '',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $pipe->refresh();
        $this->assertNull($pipe->admin_workflow_stage_id);
        $this->assertSame((int) $finalizadoId, (int) $pipe->stage_id);
    }
}
