<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionTripRegistration;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionTripRegistrationAdminTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');
    }

    public function test_admin_can_view_trip_registrations_tab(): void
    {
        MissionTripRegistration::query()->create([
            'church_id' => $this->church->id,
            'trip_slug' => MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026,
            'full_name' => 'Maria Silva',
            'phone' => '11999998888',
            'email' => 'maria@example.com',
            'has_passport' => true,
            'participated_foreign_mission_before' => false,
            'profession' => 'Enfermeiro',
        ]);

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.trip-registrations.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mission/TripRegistrations')
            ->has('registrations.data', 1)
            ->where('registrations.data.0.fullName', 'Maria Silva')
            ->has('signupUrl'));
    }

    public function test_admin_can_export_trip_registrations_as_excel(): void
    {
        MissionTripRegistration::query()->create([
            'church_id' => $this->church->id,
            'trip_slug' => MissionTripRegistration::TRIP_THAILAND_MYANMAR_2026,
            'full_name' => 'João Export',
            'phone' => '11988887777',
            'email' => 'joao@example.com',
            'has_passport' => false,
            'participated_foreign_mission_before' => true,
            'profession' => 'Médico',
        ]);

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.trip-registrations.export'));

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
    }
}
