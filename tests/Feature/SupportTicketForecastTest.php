<?php

namespace Tests\Feature;

use App\Mail\SupportTicketStaffMessageMail;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Models\UserInboxNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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
        Mail::fake();

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

        $solution = 'Redefinimos a senha e o acesso voltou ao normal.';

        $this->actingAs($admin)
            ->patch(route('support.update', ['token' => $token]), [
                'status' => AppSupportTicket::STATUS_RESOLVED,
                'solution_text' => $solution,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_inbox_notifications', [
            'user_id' => $owner->id,
            'title' => 'Atualização no seu chamado',
        ]);

        Mail::assertQueued(SupportTicketStaffMessageMail::class, function (SupportTicketStaffMessageMail $mail) use ($owner, $solution) {
            return $mail->hasTo($owner->email) && str_contains($mail->messageContent, $solution);
        });
    }

    public function test_status_change_without_finalizing_sends_email(): void
    {
        Mail::fake();

        $admin = $this->superAdmin();
        $owner = User::factory()->create();
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
                'status' => AppSupportTicket::STATUS_WAITING_USER,
            ])
            ->assertRedirect();

        Mail::assertQueued(SupportTicketStaffMessageMail::class, function (SupportTicketStaffMessageMail $mail) use ($owner) {
            return $mail->hasTo($owner->email)
                && str_contains($mail->messageContent, 'Aguardando usuário');
        });
    }

    public function test_saving_solution_draft_sends_email(): void
    {
        Mail::fake();

        $admin = $this->superAdmin();
        $owner = User::factory()->create();
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $owner->id,
            'type' => 'problem',
            'message' => 'Erro ao entrar',
            'status' => AppSupportTicket::STATUS_WAITING_USER,
        ]);

        $solution = 'Atualizamos a senha; altere no perfil após entrar.';

        $this->actingAs($admin)
            ->patch(route('support.update', ['token' => $token]), [
                'solution_text' => $solution,
            ])
            ->assertRedirect();

        Mail::assertQueued(SupportTicketStaffMessageMail::class, function (SupportTicketStaffMessageMail $mail) use ($owner, $solution) {
            return $mail->hasTo($owner->email) && str_contains($mail->messageContent, $solution);
        });
    }

    public function test_staff_chat_message_sends_email_with_content(): void
    {
        Mail::fake();

        $admin = $this->superAdmin();
        $owner = User::factory()->create();
        $token = (string) Str::uuid();

        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $owner->id,
            'type' => 'problem',
            'message' => 'Erro ao entrar',
            'status' => AppSupportTicket::STATUS_WAITING_USER,
        ]);

        $chatBody = 'Pode tentar de novo com a nova senha enviada por SMS.';

        $this->actingAs($admin)
            ->post(route('support.messages.store', ['token' => $token]), [
                'content' => $chatBody,
            ])
            ->assertRedirect();

        Mail::assertQueued(SupportTicketStaffMessageMail::class, function (SupportTicketStaffMessageMail $mail) use ($owner, $chatBody) {
            return $mail->hasTo($owner->email) && str_contains($mail->messageContent, $chatBody);
        });
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
