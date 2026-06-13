<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionTripRegistration;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionTripRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function validPayload(): array
    {
        return [
            'full_name' => 'João Silva',
            'instagram' => '@joaosilva',
            'phone' => '11999998888',
            'email' => 'joao@example.com',
            'has_passport' => true,
            'participated_foreign_mission_before' => false,
            'profession' => 'Enfermeiro',
        ];
    }

    public function test_trip_registration_page_renders(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.mission.trip-registration.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/MissionTripSignup')
                ->has('storeUrl')
                ->has('professions'));
    }

    public function test_trip_registration_is_stored_from_signup_page(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $response = $this->post(route('mobile.mission.trip-registration.store'), $this->validPayload());

        $response->assertRedirect(route('mobile.mission.trip-registration.create'));
        $response->assertSessionHas('trip_signup_success', true);

        $this->assertDatabaseHas('mission_trip_registrations', [
            'church_id' => $church->id,
            'email' => 'joao@example.com',
            'full_name' => 'João Silva',
            'profession' => 'Enfermeiro',
            'has_passport' => true,
            'participated_foreign_mission_before' => false,
        ]);
    }

    public function test_trip_registration_requires_profession_other_when_outro(): void
    {
        $this->seed(ChurchSeeder::class);

        $response = $this->post(route('mobile.mission.trip-registration.store'), [
            ...$this->validPayload(),
            'profession' => 'Outro',
            'profession_other' => '',
        ]);

        $response->assertSessionHasErrors('profession_other');
    }

    public function test_duplicate_email_updates_existing_registration(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        MissionTripRegistration::query()->create([
            'church_id' => $church->id,
            'trip_slug' => MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026,
            'full_name' => 'Nome antigo',
            'phone' => '11888887777',
            'email' => 'joao@example.com',
            'has_passport' => false,
            'participated_foreign_mission_before' => false,
            'profession' => 'Médico',
        ]);

        $this->post(route('mobile.mission.trip-registration.store'), $this->validPayload());

        $this->assertSame(1, MissionTripRegistration::query()->count());
        $this->assertDatabaseHas('mission_trip_registrations', [
            'email' => 'joao@example.com',
            'full_name' => 'João Silva',
            'profession' => 'Enfermeiro',
        ]);
    }
}
