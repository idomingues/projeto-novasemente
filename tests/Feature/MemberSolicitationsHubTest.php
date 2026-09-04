<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Pastor;
use App\Models\PastoralAppointment;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MemberSolicitationsHubTest extends TestCase
{
    use RefreshDatabase;

    public function test_hub_includes_pastoral_appointments_and_booking_props(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);
        $pastor = Pastor::query()->create([
            'church_id' => $church->id,
            'name' => 'Pr. Teste',
        ]);

        $appointment = PastoralAppointment::query()->create([
            'church_id' => $church->id,
            'requester_user_id' => $user->id,
            'requester_name' => $user->name,
            'preferred_pastor_id' => $pastor->id,
            'created_by_user_id' => $user->id,
            'source' => 'member_request',
            'status' => 'pending',
            'subject' => 'Conversa',
        ]);

        ChurchSolicitation::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'type' => 'baptism',
            'status' => 'pending',
            'message' => 'Quero ser batizado',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.solicitations.hub'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Solicitations/Hub')
                ->where('types.0.type', 'pastoral')
                ->where('types.0.label', 'Horário com pastor')
                ->has('mySolicitations', 1)
                ->has('appointments', 1)
                ->where('appointments.0.id', $appointment->id)
                ->where('appointments.0.typeLabel', 'Horário com pastor')
                ->has('pastoralBooking.pastors')
                ->has('pastoralBooking.storeUrl')
                ->has('pastoralBooking.defaultRequesterName'));
    }

    public function test_legacy_pastoral_hub_redirects_to_solicitations(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $this->actingAs($user)
            ->get(route('mobile.pastoral-appointments.request'))
            ->assertRedirect(route('mobile.solicitations.hub', [
                'novo' => '1',
                'tipo' => 'pastoral',
            ]));
    }

    public function test_legacy_pastoral_hub_with_appointment_redirects_to_detail(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id]);

        $this->actingAs($user)
            ->get(route('mobile.pastoral-appointments.request', [
                'appointment' => '12',
                'painel' => 'chat',
            ]))
            ->assertRedirect(route('mobile.solicitations.hub', [
                'appointment' => '12',
                'painel' => 'chat',
            ]));
    }

    public function test_creating_pastor_visit_is_blocked(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id, 'phone' => '11999990000']);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->from(route('mobile.solicitations.hub'))
            ->post(route('mobile.solicitations.store'), [
                'type' => 'pastor_visit',
                'message' => 'Quero uma visita',
                'email' => $user->email,
                'phone' => '11999990000',
            ])
            ->assertSessionHasErrors('type');
    }

    public function test_store_requires_email_and_phone(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create(['church_id' => $church->id, 'phone' => null]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->from(route('mobile.solicitations.hub'))
            ->post(route('mobile.solicitations.store'), [
                'type' => 'baby_presentation',
                'message' => 'Gostaria de apresentar meu bebê',
            ])
            ->assertSessionHasErrors(['email', 'phone']);

        $this->assertDatabaseMissing('church_solicitations', [
            'user_id' => $user->id,
            'type' => 'baby_presentation',
        ]);
    }

    public function test_store_saves_contact_on_user_profile(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'laricy.antiga@example.com',
            'phone' => null,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mobile.solicitations.store'), [
                'type' => 'baby_presentation',
                'message' => 'Gostaria de apresentar meu bebê',
                'email' => 'laricy.contato@example.com',
                'phone' => '(11) 98888-7777',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('church_solicitations', [
            'user_id' => $user->id,
            'type' => 'baby_presentation',
            'message' => 'Gostaria de apresentar meu bebê',
        ]);

        $user->refresh();
        $this->assertSame('laricy.contato@example.com', $user->email);
        $this->assertSame('(11) 98888-7777', $user->phone);
    }
}
