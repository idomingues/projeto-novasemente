<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
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
}
