<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\User;
use App\Mail\SupportTicketStaffMessageMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MobileSupportGuestTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_open_support_index(): void
    {
        $this->get(route('mobile.support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->where('isAuthenticated', false)
                ->where('userName', null)
            );
    }

    public function test_guest_can_view_ticket_by_public_token(): void
    {
        $token = (string) Str::uuid();
        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => null,
            'type' => 'problem',
            'message' => 'Não consigo fazer login',
            'guest_name' => 'Visitante',
            'status' => 'open',
        ]);

        $this->get(route('mobile.support.ticket', ['token' => $token]))
            ->assertRedirect(route('mobile.support.index', ['modal' => $token]));

        $this->get(route('mobile.support.index', ['modal' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->has('modalDetail')
                ->where('modalDetail.isGuestTicket', true)
                ->where('modalDetail.guestName', 'Visitante')
                ->where('modalDetail.canChat', false)
                ->has('tickets', 1)
                ->where('tickets.0.publicToken', $token)
            );
    }

    public function test_guest_store_keeps_ticket_in_list_and_dedupes_identical_resubmit(): void
    {
        $payload = [
            'type' => 'problem',
            'message' => 'Boa tarde, esqueci minha senha e não consigo redefinir.',
            'guest_name' => 'Eduardo Naziazeno Rosa',
            'guest_email' => 'eduardo@phonebills.com.br',
            'guest_phone' => '44991768787',
        ];

        $first = $this->from(route('mobile.support.index'))
            ->post(route('mobile.support.store'), $payload);
        $first->assertRedirect();
        $this->assertSame(1, AppSupportTicket::query()->count());

        $token = (string) AppSupportTicket::query()->firstOrFail()->public_token;
        $first->assertRedirect(route('mobile.support.index', ['modal' => $token]));

        $this->get(route('mobile.support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->has('tickets', 1)
                ->where('tickets.0.publicToken', $token)
            );

        $second = $this->from(route('mobile.support.index'))
            ->post(route('mobile.support.store'), $payload);
        $second->assertRedirect(route('mobile.support.index', ['modal' => $token]));
        $this->assertSame(1, AppSupportTicket::query()->count());
    }

    public function test_admin_mobile_support_lists_only_own_tickets(): void
    {
        $guard = config('auth.defaults.guard', 'web');
        $admin = User::factory()->create(['name' => 'Ivan Admin']);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]));

        $other = User::factory()->create();

        $ownToken = (string) Str::uuid();
        AppSupportTicket::create([
            'public_token' => $ownToken,
            'user_id' => $admin->id,
            'type' => 'problem',
            'message' => 'Meu chamado',
            'status' => 'open',
        ]);

        AppSupportTicket::create([
            'public_token' => (string) Str::uuid(),
            'user_id' => $other->id,
            'type' => 'problem',
            'message' => 'Chamado de outro usuário',
            'status' => 'open',
        ]);

        AppSupportTicket::create([
            'public_token' => (string) Str::uuid(),
            'user_id' => null,
            'type' => 'problem',
            'message' => 'Chamado de visitante',
            'guest_name' => 'Visitante',
            'status' => 'open',
        ]);

        $this->actingAs($admin)
            ->get(route('mobile.support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->has('tickets', 1)
                ->where('tickets.0.publicToken', $ownToken)
            );
    }

    public function test_logged_in_user_sees_name_on_support_index(): void
    {
        $user = User::factory()->create(['name' => 'Maria Silva']);

        $this->actingAs($user)
            ->get(route('mobile.support.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->where('isAuthenticated', true)
                ->where('userName', 'Maria Silva')
            );
    }

    public function test_logged_in_owner_can_chat_on_own_ticket(): void
    {
        $user = User::factory()->create();
        $token = (string) Str::uuid();
        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $user->id,
            'type' => 'suggestion',
            'message' => 'Sugestão de melhoria',
            'status' => 'open',
        ]);

        $this->actingAs($user)
            ->get(route('mobile.support.index', ['modal' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->has('modalDetail')
                ->where('modalDetail.canChat', true)
                ->where('modalDetail.isGuestTicket', false)
            );
    }

    public function test_admin_can_chat_and_reply_on_guest_ticket(): void
    {
        Mail::fake();

        $guard = config('auth.defaults.guard', 'web');
        $admin = User::factory()->create(['name' => 'Ivan Admin']);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]));

        $token = (string) Str::uuid();
        AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => null,
            'type' => 'problem',
            'message' => 'Não consigo redefinir a senha',
            'guest_name' => 'Eduardo Naziazeno Rosa',
            'guest_email' => 'eduardo@example.com',
            'status' => 'open',
        ]);

        $this->actingAs($admin)
            ->get(route('mobile.support.index', ['modal' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Support')
                ->has('modalDetail')
                ->where('modalDetail.canChat', true)
                ->where('modalDetail.isGuestTicket', true)
                ->where('modalDetail.isAdmin', true)
            );

        $reply = 'Olá Eduardo, vamos ajudar com a redefinição da senha.';

        $this->actingAs($admin)
            ->post(route('mobile.support.messages.store', ['token' => $token]), [
                'content' => $reply,
            ])
            ->assertRedirect(route('mobile.support.index', ['modal' => $token]));

        $this->assertDatabaseHas('app_support_messages', [
            'content' => $reply,
            'sender_type' => 'admin',
            'sender_user_id' => $admin->id,
        ]);

        Mail::assertQueued(SupportTicketStaffMessageMail::class, function (SupportTicketStaffMessageMail $mail) use ($reply) {
            return $mail->hasTo('eduardo@example.com') && str_contains($mail->messageContent, $reply);
        });
    }
}
