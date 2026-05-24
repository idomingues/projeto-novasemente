<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\User;
use App\Models\UserInboxNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SupportTicketForecastTest extends TestCase
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

    public function test_setting_forecast_notifies_ticket_owner(): void
    {
        $admin = $this->superAdmin();
        $owner = User::factory()->create(['notify_via_app' => true]);
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $owner->id,
            'type' => 'problem',
            'message' => 'Erro ao entrar',
            'status' => AppSupportTicket::STATUS_OPEN,
        ]);

        $this->actingAs($admin)
            ->patch(route('support.update', ['token' => $token]), [
                'forecast_at' => '2026-06-15',
            ])
            ->assertRedirect();

        $ticket = AppSupportTicket::query()->where('public_token', $token)->first();
        $this->assertNotNull($ticket);
        $this->assertSame('2026-06-15', $ticket->forecast_at?->toDateString());

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $owner->id,
            'title' => 'Prazo definido no seu chamado',
        ]);

        $notification = UserInboxNotification::query()
            ->where('user_id', $owner->id)
            ->where('title', 'Prazo definido no seu chamado')
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('15 de junho de 2026', (string) $notification->body);
    }

    public function test_finalizing_ticket_notifies_owner(): void
    {
        $admin = $this->superAdmin();
        $owner = User::factory()->create(['notify_via_app' => true]);
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $owner->id,
            'type' => 'problem',
            'message' => 'Erro ao entrar',
            'status' => AppSupportTicket::STATUS_IN_PROGRESS,
        ]);

        $this->actingAs($admin)
            ->patch(route('support.update', ['token' => $token]), [
                'status' => AppSupportTicket::STATUS_RESOLVED,
                'solution_text' => 'Redefinimos a senha e o acesso voltou ao normal.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $owner->id,
            'title' => 'Atualização no seu chamado',
        ]);
    }

    public function test_clearing_forecast_does_not_notify(): void
    {
        $admin = $this->superAdmin();
        $owner = User::factory()->create(['notify_via_app' => true]);
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $owner->id,
            'type' => 'problem',
            'message' => 'Erro ao entrar',
            'status' => AppSupportTicket::STATUS_OPEN,
            'forecast_at' => '2026-06-15',
        ]);

        UserInboxNotification::query()->where('user_id', $owner->id)->delete();

        $this->actingAs($admin)
            ->patch(route('support.update', ['token' => $token]), [
                'forecast_at' => null,
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('user_inbox_notifications', [
            'user_id' => $owner->id,
            'title' => 'Prazo definido no seu chamado',
        ]);
    }
}
