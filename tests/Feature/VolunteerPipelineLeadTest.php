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
        $response->assertJsonPath('passwordFormMode', 'update');
    }

    public function test_pipeline_admin_can_create_app_account_from_ficha_when_volunteer_has_email(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $volunteer = Volunteer::query()->create([
            'name' => 'Karina Sem Conta',
            'email' => 'karina.sem.conta@example.com',
            'phone' => '11988887777',
            'active' => true,
        ]);
        $volunteer->ministries()->sync([$ministry->id]);

        $this->actingAs($admin)->getJson(route('ministry-lead.volunteers.pipeline.detail', $volunteer))
            ->assertOk()
            ->assertJsonPath('passwordFormMode', 'create')
            ->assertJsonPath('updatePasswordUrl', route('ministry-lead.volunteers.pipeline.password', $volunteer));

        $this->actingAs($admin)
            ->from(route('ministry-lead.volunteers.index'))
            ->patch(route('ministry-lead.volunteers.pipeline.password', $volunteer), [
                'app_password' => 'SenhaInicial789',
                'app_password_confirmation' => 'SenhaInicial789',
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $volunteer->refresh();
        $this->assertNotNull($volunteer->user_id);
        $user = User::query()->findOrFail((int) $volunteer->user_id);
        $this->assertSame('karina.sem.conta@example.com', strtolower((string) $user->email));
        $this->assertTrue(\Illuminate\Support\Facades\Hash::check('SenhaInicial789', $user->password));
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

    public function test_denied_leader_status_detaches_volunteer_from_ministry(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Recusa Desvincula',
            'email' => 'recusa.desvincula@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'recusa.desvincula@example.com')->firstOrFail();
        $this->assertTrue($volunteer->ministries()->whereKey($ministry->id)->exists());

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'denied',
                'leader_note' => 'Não atende aos critérios do departamento neste momento.',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $volunteer->refresh();
        $this->assertFalse($volunteer->ministries()->whereKey($ministry->id)->exists());

        $invitation = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->first();

        $this->assertNotNull($invitation);
        $this->assertSame('denied', $invitation->leader_status);
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
            ->assertRedirect(route('ministry-lead.volunteers.pedidos'));
    }

    public function test_pedidos_page_includes_volunteer_request_props_for_admin(): void
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
                ->has('volunteerRequestMinistries')
                ->has('volunteerRequestStoreUrl')
                ->has('volunteersForAttach')
                ->has('attachVolunteerPickerUrl')
                ->has('centralUrl'));
    }

    public function test_pedidos_page_redirects_without_solicitations_manage(): void
    {
        $this->seed();

        $user = User::factory()->create();
        $user->givePermissionTo('volunteers.view');

        $church = Church::query()->firstOrFail();

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.pedidos'))
            ->assertForbidden();
    }

    public function test_roster_shows_encaminhado_as_admin_workflow_stage_when_pipeline_stage_is_encaminhado(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Lista Fase Principal',
            'email' => 'lista.fase.principal@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'lista.fase.principal@example.com')->firstOrFail();

        \App\Support\VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $church->id, 'encaminhado');

        $encaminhadoId = \App\Models\VolunteerPipelineStage::query()
            ->where('church_id', $church->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
            ->value('id');

        $this->assertNotNull($encaminhadoId);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', [
                'ministerio' => $ministry->id,
                'pipeline_stage_id' => (string) $encaminhadoId,
            ]))
            ->assertOk();

        $row = collect($response->viewData('page')['props']['volunteers']['data'])
            ->firstWhere('id', $volunteer->id);

        $this->assertNotNull($row);
        $this->assertSame('Encaminhado', $row['adminWorkflowStageName']);
    }

    public function test_admin_can_filter_sem_fase_principal(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Filtro Sem Fase Principal',
            'email' => 'filtro.sem.fase.principal@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'filtro.sem.fase.principal@example.com')->firstOrFail();

        \App\Support\VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $church->id, 'em treinamento');

        \App\Models\VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $church->id)
            ->update(['admin_workflow_stage_id' => null]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', [
                'ministerio' => $ministry->id,
                'pipeline_stage_id' => \App\Support\VolunteerLeadRosterFilters::PIPELINE_STAGE_ADMIN_WORKFLOW_BLANK,
            ]))
            ->assertOk();

        $ids = collect($response->viewData('page')['props']['volunteers']['data'])->pluck('id')->all();
        $this->assertContains($volunteer->id, $ids);
    }

    public function test_move_to_encaminhado_syncs_admin_workflow_stage(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fase Principal Encaminhado',
            'email' => 'fase.principal.encaminhado@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'fase.principal.encaminhado@example.com')->firstOrFail();

        $encaminhadoId = \App\Models\VolunteerPipelineStage::query()
            ->where('church_id', $church->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
            ->value('id');

        $this->assertNotNull($encaminhadoId);

        \App\Support\VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $church->id, 'encaminhado');

        $pipe = \App\Models\VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $church->id)
            ->firstOrFail();

        $this->assertSame((int) $encaminhadoId, (int) $pipe->stage_id);
        $this->assertSame((int) $encaminhadoId, (int) $pipe->admin_workflow_stage_id);

        $response = $this->actingAs($admin)->getJson(
            route('ministry-lead.volunteers.pipeline.detail', $volunteer),
        );

        $response->assertOk();
        $response->assertJsonPath('pipeline.stageName', 'Encaminhado');
        $response->assertJsonPath('pipeline.adminWorkflowStageId', (int) $encaminhadoId);
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

    public function test_admin_can_set_atuante_as_admin_workflow_stage(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        \App\Support\VolunteerPipelineBootstrap::ensureAtuanteStageForChurch((int) $church->id);

        $atuanteId = \App\Models\VolunteerPipelineStage::query()
            ->where('church_id', $church->id)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['atuante'])
            ->value('id');

        $this->assertNotNull($atuanteId);

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fase Principal Atuante',
            'email' => 'fase.principal.atuante@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'fase.principal.atuante@example.com')->firstOrFail();

        $this->actingAs($admin)
            ->patch(route('ministry-lead.volunteers.pipeline.stage', $volunteer), [
                'stage_id' => (int) $atuanteId,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $pipe = \App\Models\VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $church->id)
            ->firstOrFail();

        $this->assertSame((int) $atuanteId, (int) $pipe->admin_workflow_stage_id);
        $this->assertSame((int) $atuanteId, (int) $pipe->stage_id);

        $response = $this->actingAs($admin)->getJson(
            route('ministry-lead.volunteers.pipeline.detail', $volunteer),
        );

        $response->assertOk();
        $response->assertJsonPath('pipeline.adminWorkflowStageId', (int) $atuanteId);
        $stageNames = collect($response->json('stages'))->pluck('name')->map(fn ($n) => mb_strtolower(trim((string) $n)))->all();
        $this->assertContains('atuante', $stageNames);
    }

    public function test_central_index_exposes_default_sort_in_board_filters(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central'))
            ->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->component('MinistryLeadVolunteers/ManagementCenter')
            ->where('boardFilters.sort', 'name')
            ->where('boardFilters.sort_dir', 'asc'));
    }

    public function test_pipeline_list_includes_ministry_phases_as_department_arrow_phase(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Fases Depto Lista',
            'email' => 'fases.depto.lista@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'fases.depto.lista@example.com')->firstOrFail();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => 'training',
            'leader_status_set_by_user_id' => $admin->id,
            'leader_status_set_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', ['ministerio' => $ministry->id]))
            ->assertOk();

        $row = collect($response->viewData('page')['props']['volunteers']['data'])
            ->firstWhere('id', $volunteer->id);

        $this->assertNotNull($row);
        $this->assertSame([
            [
                'ministryName' => $ministry->name,
                'inviteLabel' => 'Aceito',
                'departmentStatusLabel' => 'Em treinamento',
            ],
        ], $row['ministryPhases']);
    }

    public function test_pipeline_list_distinguishes_forwarded_from_sent_pending_invite(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Encaminhado Sem Envio',
            'email' => 'encaminhado.sem.envio@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $forwardedOnly = Volunteer::query()->where('email', 'encaminhado.sem.envio@example.com')->firstOrFail();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $forwardedOnly->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Convite Enviado',
            'email' => 'convite.enviado@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $sentInvite = Volunteer::query()->where('email', 'convite.enviado@example.com')->firstOrFail();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $sentInvite->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'sent_at' => now(),
            'expires_at' => now()->addDays(14),
        ]);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', ['ministerio' => $ministry->id]))
            ->assertOk();

        $forwardedRow = collect($response->viewData('page')['props']['volunteers']['data'])
            ->firstWhere('id', $forwardedOnly->id);
        $sentRow = collect($response->viewData('page')['props']['volunteers']['data'])
            ->firstWhere('id', $sentInvite->id);

        $this->assertSame('Convite não enviado', $forwardedRow['ministryPhases'][0]['inviteLabel']);
        $this->assertSame('—', $forwardedRow['ministryPhases'][0]['departmentStatusLabel']);
        $this->assertSame('Aguardando resposta', $sentRow['ministryPhases'][0]['inviteLabel']);
        $this->assertSame('—', $sentRow['ministryPhases'][0]['departmentStatusLabel']);
    }

    public function test_pipeline_can_sort_volunteers_by_created_at_desc(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Antigo Sort',
            'email' => 'antigo.sort@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $older = Volunteer::query()->where('email', 'antigo.sort@example.com')->firstOrFail();
        $older->forceFill(['created_at' => now()->subDays(10)])->save();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Recente Sort',
            'email' => 'recente.sort@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $newer = Volunteer::query()->where('email', 'recente.sort@example.com')->firstOrFail();
        $newer->forceFill(['created_at' => now()->subDay()])->save();

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', [
                'ministerio' => $ministry->id,
                'sort' => 'created_at',
                'sort_dir' => 'desc',
            ]))
            ->assertOk();

        $names = collect($response->viewData('page')['props']['volunteers']['data'])->pluck('name')->all();
        $recenteIndex = array_search('Recente Sort', $names, true);
        $antigoIndex = array_search('Antigo Sort', $names, true);

        $this->assertNotFalse($recenteIndex);
        $this->assertNotFalse($antigoIndex);
        $this->assertLessThan($antigoIndex, $recenteIndex);
    }
}
