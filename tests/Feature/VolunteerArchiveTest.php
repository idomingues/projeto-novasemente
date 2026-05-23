<?php

namespace Tests\Feature;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
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

    public function test_pipeline_hides_archived_volunteers_by_default(): void
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
            ->get(route('ministry-lead.volunteers.index', ['secao' => 'quadro']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.arquivados', false)
                ->where('filters.pipeline_stage_id', ''));

        $activeIds = collect($activeList->viewData('page')['props']['volunteers']['data'])->pluck('id');
        $this->assertTrue($activeIds->contains($active->id));
        $this->assertFalse($activeIds->contains($archived->id));

        $archivedList = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.index', [
                'secao' => 'quadro',
                'pipeline_stage_id' => 'arquivados',
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.arquivados', true)
                ->where('filters.pipeline_stage_id', 'arquivados')
                ->where('archivedVolunteerCount', 1));

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

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('ministry-lead.volunteers.pipeline.archive', $volunteer))
            ->assertRedirect(route('ministry-lead.volunteers.index', ['secao' => 'quadro']))
            ->assertSessionHas('success');

        $pipe = VolunteerChurchPipeline::query()
            ->where('church_id', $church->id)
            ->where('volunteer_id', $volunteer->id)
            ->first();
        $this->assertNotNull($pipe?->staff_archived_at);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('ministry-lead.volunteers.pipeline.unarchive', $volunteer))
            ->assertRedirect(route('ministry-lead.volunteers.index', [
                'secao' => 'quadro',
                'pipeline_stage_id' => 'arquivados',
            ]))
            ->assertSessionHas('success');

        $this->assertNull($pipe->fresh()->staff_archived_at);
    }

    public function test_pipeline_pedidos_hides_archived_volunteer_requests(): void
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
            ->get(route('ministry-lead.volunteers.index', ['secao' => 'pedidos']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('volunteerRequestFilters.arquivados', false)
                ->has('volunteerRequestRows', 1)
                ->where('volunteerRequestRows.0.id', $active->id));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('ministry-lead.volunteers.index', ['secao' => 'pedidos', 'arquivados' => '1']))
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
            ->assertRedirect(route('ministry-lead.volunteers.index', ['secao' => 'pedidos']))
            ->assertSessionHas('success');

        $this->assertNotNull($solicitation->fresh()->staff_archived_at);
    }
}
