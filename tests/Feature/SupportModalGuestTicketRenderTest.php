<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SupportModalGuestTicketRenderTest extends TestCase
{
    use RefreshDatabase;

    public function test_support_index_loads_modal_for_guest_problem_ticket(): void
    {
        $guard = config('auth.defaults.guard', 'web');
        foreach (['support.view', 'support.manage'] as $p) {
            Permission::findOrCreate($p, $guard);
        }
        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);
        $role->givePermissionTo(['support.view', 'support.manage']);
        $admin = User::factory()->create();
        $admin->assignRole($role);

        $token = '85e956e6-1be9-4ec9-a689-48633c4aae90';
        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => null,
            'type' => 'problem',
            'demand_category' => 'client',
            'priority' => 'medium',
            'message' => 'Boa tarde , esqueci minha senha cadastrada e agora estou tentando redefinição , mas infelizmente não estou conseguindo criar nova senha , conseguem me ajudar por gentileza ?',
            'guest_name' => 'Eduardo Naziazeno Rosa',
            'guest_email' => 'eduardo@phonebills.com.br',
            'status' => AppSupportTicket::STATUS_OPEN,
        ]);

        $response = $this->actingAs($admin)
            ->get(route('support.index', [
                'inbox' => 1094,
                'modal' => $token,
            ]));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Support/Index')
            ->where('modalDetail.ticket.publicToken', $token)
            ->where('modalDetail.ticket.isGuest', true)
            ->where('modalDetail.ticket.allowStaffInternalChat', true)
            ->where('modalDetail.ticket.type', 'problem')
            ->where('modalDetail.ticket.forecastAt', null)
            ->where('modalDetail.supportUpdateUrl', '/suporte/'.$token)
            ->has('modalDetail.statusOptions')
            ->has('modalDetail.priorityOptions'));
    }
}
