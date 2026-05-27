<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\User;
use App\Support\AppSupportTicketOptions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SupportTicketDemandFieldsTest extends TestCase
{
    use RefreshDatabase;

    private function superAdmin(): User
    {
        $guard = config('auth.defaults.guard', 'web');
        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => $guard]);
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_creating_dev_item_sets_pending_status_and_demand_fields(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)
            ->post(route('support.store'), [
                'message' => 'Exportar presenças em PDF',
                'demand_category' => AppSupportTicketOptions::DEMAND_CATEGORY_INTERNAL,
                'priority' => 'high',
                'forecast_at' => '2026-07-01',
            ])
            ->assertRedirect();

        $ticket = AppSupportTicket::query()->latest('id')->first();
        $this->assertNotNull($ticket);
        $this->assertSame(AppSupportTicket::STATUS_OPEN, $ticket->status);
        $this->assertSame(AppSupportTicketOptions::DEMAND_CATEGORY_INTERNAL, $ticket->demand_category);
        $this->assertSame('high', $ticket->priority);
        $this->assertSame('2026-07-01', $ticket->forecast_at?->toDateString());
    }

    public function test_support_index_includes_kanban_payload(): void
    {
        $admin = $this->superAdmin();
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $admin->id,
            'type' => 'development',
            'demand_category' => AppSupportTicketOptions::DEMAND_CATEGORY_CLIENT,
            'priority' => AppSupportTicket::PRIORITY_MEDIUM,
            'message' => 'Melhorar filtros',
            'status' => AppSupportTicket::STATUS_OPEN,
        ]);

        $this->actingAs($admin)
            ->get(route('support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Support/Index')
                ->has('kanbanTickets', 1)
                ->has('demandCategoryOptions')
                ->has('priorityOptions')
                ->where('statusOptions.1.label', 'Pendente'));
    }
}
