<?php

namespace Tests\Feature;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Support\PastoralSolicitationStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InformalPastoralSolicitationTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_staff_can_register_informal_pastoral_with_name_only(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('solicitations.informal-pastoral.store'), [
                'requester_name' => 'Maria Silva',
                'message' => 'Atendimento por telefone após crise familiar.',
                'status' => PastoralSolicitationStatus::COMPLETED,
            ]);

        $response->assertRedirect();

        $solicitation = ChurchSolicitation::query()
            ->where('type', MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL)
            ->first();

        $this->assertNotNull($solicitation);
        $this->assertSame('Maria Silva', $solicitation->memberDisplayName());
        $this->assertSame(PastoralSolicitationStatus::COMPLETED, $solicitation->status);
        $this->assertTrue((bool) data_get($solicitation->meta, 'informal'));
        $this->assertFalse($solicitation->allowsChat());
    }

    public function test_staff_can_register_informal_pastoral_for_member_with_account(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $member = User::factory()->create(['church_id' => $church->id, 'name' => 'João Membro']);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('solicitations.informal-pastoral.store'), [
                'requester_user_id' => $member->id,
                'message' => 'Visita domiciliar combinada na secretaria.',
                'status' => PastoralSolicitationStatus::PENDING,
            ])
            ->assertRedirect();

        $solicitation = ChurchSolicitation::query()
            ->where('type', MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL)
            ->where('user_id', $member->id)
            ->first();

        $this->assertNotNull($solicitation);
        $this->assertSame((int) $member->id, $solicitation->informalPastoralLinkedMemberUserId());
        $this->assertTrue($solicitation->allowsChat());
    }

    public function test_informal_pastoral_appears_on_solicitations_index(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL,
            'status' => PastoralSolicitationStatus::COMPLETED,
            'subject' => 'Atendimento pastoral informal',
            'message' => 'Resumo',
            'meta' => [
                'informal' => true,
                'requester_name' => 'Ana Costa',
                'created_by_user_id' => $admin->id,
            ],
            'completed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('solicitations.index', ['aba' => 'concluidos']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Solicitations/Index')
                ->has('demands', 1)
                ->where('demands.0.memberLabel', 'Ana Costa'));
    }
}
