<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Support\BaptismSolicitationStatus;
use App\Support\PastoralSolicitationStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PastoralSolicitationIndexTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): \App\Models\User
    {
        $this->seed();

        $user = \App\Models\User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_solicitations_index_filters_by_tab(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $pending = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::PENDING,
            'subject' => 'Visita pendente',
            'message' => 'Mensagem',
        ]);

        $completed = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::COMPLETED,
            'subject' => 'Visita concluída',
            'message' => 'Mensagem',
            'completed_at' => now(),
        ]);

        $archived = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'bible_study',
            'status' => PastoralSolicitationStatus::ARCHIVED,
            'subject' => 'Estudo arquivado',
            'message' => 'Mensagem',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Solicitations/Index')
                ->where('filters.aba', 'pendente')
                ->has('demands', 1)
                ->where('demands.0.id', $pending->id));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index', ['aba' => 'concluidos']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.aba', 'concluidos')
                ->has('demands', 1)
                ->where('demands.0.id', $completed->id));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index', ['aba' => 'arquivados']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.aba', 'arquivados')
                ->has('demands', 1)
                ->where('demands.0.id', $archived->id));
    }

    public function test_admin_can_update_pastoral_status_via_patch(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'other',
            'status' => PastoralSolicitationStatus::PENDING,
            'subject' => 'Outro',
            'message' => 'Conteúdo',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->patch(route('solicitations.update', $solicitation), [
                'status' => PastoralSolicitationStatus::ARCHIVED,
            ])
            ->assertRedirect(route('solicitations.index', [
                'aba' => 'arquivados',
                'modal_kind' => 'solicitation',
                'modal_id' => (string) $solicitation->id,
            ]));

        $this->assertSame(PastoralSolicitationStatus::ARCHIVED, $solicitation->fresh()->status);
    }

    public function test_sidebar_badge_counts_only_pending_atendimento_excluding_baptism(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::PENDING,
            'subject' => 'Visita pendente',
            'message' => 'Mensagem',
        ]);

        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::COMPLETED,
            'subject' => 'Visita concluída',
            'message' => 'Mensagem',
            'completed_at' => now(),
        ]);

        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::PENDING,
            'subject' => 'Batismo pendente',
            'message' => 'Mensagem',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('auth.openSolicitationsCount', 1)
                ->where('auth.openBaptismRequestsCount', 1));
    }

    public function test_solicitations_index_sorts_by_updated_at_asc(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $older = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::PENDING,
            'subject' => 'Visita antiga',
            'message' => 'Mensagem',
        ]);
        $older->forceFill(['updated_at' => now()->subDays(2)])->saveQuietly();

        $newer = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'pastor_visit',
            'status' => PastoralSolicitationStatus::PENDING,
            'subject' => 'Visita recente',
            'message' => 'Mensagem',
        ]);
        $newer->forceFill(['updated_at' => now()])->saveQuietly();

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index', ['sort' => 'updated_asc']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.sort', 'updated_asc')
                ->has('demands', 2)
                ->where('demands.0.id', $older->id)
                ->where('demands.1.id', $newer->id));
    }
}
