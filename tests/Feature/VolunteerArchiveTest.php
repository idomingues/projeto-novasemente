<?php

namespace Tests\Feature;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Support\VolunteerLeadRosterFilters;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerArchiveTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_central_hides_archived_volunteers_by_default(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $active = Volunteer::query()->create([
            'name' => 'Voluntário Ativo Arquivo',
            'email' => 'ativo.arquivo@example.com',
            'active' => true,
        ]);
        $archived = Volunteer::query()->create([
            'name' => 'Voluntário Arquivado Arquivo',
            'email' => 'arquivado.arquivo@example.com',
            'active' => true,
        ]);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($active, (int) $church->id);
        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($archived, (int) $church->id);
        VolunteerChurchPipeline::query()
            ->where('church_id', $church->id)
            ->where('volunteer_id', $archived->id)
            ->update(['staff_archived_at' => now()]);

        $this->assertNotNull(
            VolunteerChurchPipeline::query()
                ->where('church_id', $church->id)
                ->where('volunteer_id', $archived->id)
                ->value('staff_archived_at')
        );

        $activeList = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', ['ministerio' => 'none']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MinistryLeadVolunteers/ManagementCenter')
                ->where('boardFilters.arquivados', false)
                ->where('boardFilters.pipeline_stage_id', ''));

        $activeIds = collect($activeList->viewData('page')['props']['volunteers']['data'])->pluck('id');
        $this->assertTrue($activeIds->contains($active->id));
        $this->assertFalse($activeIds->contains($archived->id));

        $archivedList = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.central', [
                'ministerio' => 'none',
                'pipeline_stage_id' => VolunteerLeadRosterFilters::PIPELINE_STAGE_ARCHIVED,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('boardFilters.arquivados', true)
                ->where('boardFilters.pipeline_stage_id', VolunteerLeadRosterFilters::PIPELINE_STAGE_ARCHIVED));

        $archivedIds = collect($archivedList->viewData('page')['props']['volunteers']['data'])->pluck('id');
        $this->assertTrue($archivedIds->contains($archived->id));
        $this->assertFalse($archivedIds->contains($active->id));
    }

    public function test_admin_can_archive_and_unarchive_volunteer_in_church(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $volunteer = Volunteer::query()->create([
            'name' => 'Arquivar Voluntário',
            'email' => 'arquivar.vol@example.com',
            'active' => true,
        ]);
        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, (int) $church->id);

        $archiveResponse = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('ministry-lead.volunteers.pipeline.archive', $volunteer));

        $archiveResponse->assertRedirect()->assertSessionHas('success');
        $this->assertStringStartsWith(
            route('ministry-lead.volunteers.central'),
            (string) $archiveResponse->headers->get('Location'),
        );

        $pipe = VolunteerChurchPipeline::query()
            ->where('church_id', $church->id)
            ->where('volunteer_id', $volunteer->id)
            ->first();
        $this->assertNotNull($pipe?->staff_archived_at);

        $unarchiveResponse = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('ministry-lead.volunteers.pipeline.unarchive', $volunteer));

        $unarchiveResponse->assertRedirect()->assertSessionHas('success');
        $this->assertStringContainsString(
            'pipeline_stage_id='.VolunteerLeadRosterFilters::PIPELINE_STAGE_ARCHIVED,
            (string) $unarchiveResponse->headers->get('Location'),
        );

        $this->assertNull($pipe->fresh()->staff_archived_at);
    }

    public function test_pedidos_page_hides_archived_volunteer_requests(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $active = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido ativo',
            'message' => 'Ativo',
        ]);
        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'completed',
            'subject' => 'Pedido arquivado',
            'message' => 'Arquivado',
            'staff_archived_at' => now(),
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.pedidos'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MinistryLeadVolunteers/Pedidos')
                ->where('volunteerRequestFilters.arquivados', false)
                ->has('volunteerRequestRows', 1)
                ->where('volunteerRequestRows.0.id', $active->id));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.pedidos', ['arquivados' => '1']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('volunteerRequestFilters.arquivados', true)->has('volunteerRequestRows', 1));
    }

    public function test_admin_can_archive_volunteer_request(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
            'status' => 'pending',
            'subject' => 'Pedido VR',
            'message' => 'Teste',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('volunteer-requests.staff.archive', $solicitation))
            ->assertRedirect(route('ministry-lead.volunteers.pedidos'))
            ->assertSessionHas('success');

        $this->assertNotNull($solicitation->fresh()->staff_archived_at);
    }
}
