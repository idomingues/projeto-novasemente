<?php

namespace Tests\Feature;

use App\Models\AppSupportTicket;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConversationHideFromMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_hide_solicitation_and_can_no_longer_view_it(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $solicitation = ChurchSolicitation::create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => 'other',
            'status' => 'pending',
            'message' => 'Pedido de teste',
        ]);

        $this->actingAs($user)
            ->post(route('mobile.solicitations.hide-from-member', $solicitation), ['return_to' => 'hub'])
            ->assertRedirect(route('mobile.solicitations.hub', ['lista' => '1'], false));

        $this->assertNotNull($solicitation->fresh()->member_hidden_at);

        $this->actingAs($user)
            ->get(route('mobile.solicitations.show', $solicitation))
            ->assertForbidden();
    }

    public function test_user_can_hide_support_ticket_and_can_no_longer_open_it(): void
    {
        $user = User::factory()->create();
        $token = (string) Str::uuid();
        $ticket = AppSupportTicket::create([
            'public_token' => $token,
            'user_id' => $user->id,
            'type' => 'problem',
            'message' => 'Teste',
            'status' => 'open',
        ]);

        $this->actingAs($user)
            ->post(route('mobile.support.ticket.hide', ['token' => $token]))
            ->assertRedirect(route('mobile.support.index', [], false));

        $this->assertNotNull($ticket->fresh()->user_hidden_at);

        $this->actingAs($user)
            ->get(route('mobile.support.ticket', ['token' => $token]))
            ->assertForbidden();
    }
}
