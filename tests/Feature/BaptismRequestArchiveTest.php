<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Support\BaptismSolicitationStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class BaptismRequestArchiveTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $user->assignRole(Role::firstOrCreate(['name' => 'admin']));

        return $user;
    }

    public function test_baptism_index_filters_by_tab(): void
    {
        $admin = $this->actingAsAdmin();
        $admin->forceFill([
            'email' => 'ana.batismo@example.com',
            'phone' => '(11) 98888-7777',
        ])->save();
        $church = Church::query()->firstOrFail();

        $pending = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::PENDING,
            'subject' => 'Pendente',
            'message' => 'Mensagem pendente',
        ]);

        $waiting = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::WAITING,
            'subject' => 'Aguardando',
            'message' => 'Mensagem aguardando',
        ]);

        $archived = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::ARCHIVED,
            'subject' => 'Arquivado',
            'message' => 'Mensagem arquivada',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('baptism-requests.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('BaptismRequests/Index')
                ->where('filters.aba', 'pendente')
                ->has('demands', 1)
                ->where('demands.0.id', $pending->id)
                ->where('demands.0.memberEmail', 'ana.batismo@example.com')
                ->where('demands.0.memberPhone', '(11) 98888-7777')
                ->where('tabCounts.pendente', 1)
                ->where('tabCounts.aguardando', 1)
                ->where('tabCounts.arquivados', 1));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('baptism-requests.index', ['aba' => 'aguardando']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.aba', 'aguardando')
                ->has('demands', 1)
                ->where('demands.0.id', $waiting->id));

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('baptism-requests.index', ['aba' => 'arquivados']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.aba', 'arquivados')
                ->has('demands', 1)
                ->where('demands.0.id', $archived->id));
    }

    public function test_admin_can_archive_and_restore_baptism_via_routes(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::PENDING,
            'subject' => 'Arquivar teste',
            'message' => 'Conteúdo',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('baptism-requests.archive', $solicitation))
            ->assertRedirect(route('baptism-requests.index', ['aba' => 'arquivados']))
            ->assertSessionHas('success');

        $solicitation->refresh();
        $this->assertSame(BaptismSolicitationStatus::ARCHIVED, $solicitation->status);
        $this->assertNull($solicitation->staff_archived_at);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('baptism-requests.unarchive', $solicitation))
            ->assertRedirect(route('baptism-requests.index', ['aba' => 'pendente']))
            ->assertSessionHas('success');

        $solicitation->refresh();
        $this->assertSame(BaptismSolicitationStatus::PENDING, $solicitation->status);
    }

    public function test_staff_sees_member_baptism_hub_from_mobile_card(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();

        $solicitation = ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $admin->id,
            'type' => 'baptism',
            'status' => BaptismSolicitationStatus::PENDING,
            'subject' => 'Pedido membro',
            'message' => 'Teste',
        ]);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.baptism'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Solicitations/Hub')
                ->where('pageTitle', 'Pedido de batismo')
                ->where('singleBaptismType', true)
                ->has('mySolicitations', 1)
            );

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.baptism', ['solicitacao' => $solicitation->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Solicitations/Hub')
                ->where('pageTitle', 'Pedido de batismo')
                ->has('mySolicitations', 1)
            );

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('baptism-requests.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('BaptismRequests/Index'));
    }
}
