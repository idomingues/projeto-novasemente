<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionSettingsTest extends TestCase
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

    public function test_admin_can_view_and_update_mission_whatsapp_settings(): void
    {
        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->get(route('mission.content.settings'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mission/Settings')
                ->where('whatsappDefaultMessage', '')
                ->where('canManage', true));

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->put(route('mission.content.settings.update'), [
                'whatsapp_default_message' => 'Mensagem padrão da equipe Missão.',
            ])
            ->assertRedirect(route('mission.content.settings'))
            ->assertSessionHas('success');

        $this->church->refresh();
        $this->assertSame('Mensagem padrão da equipe Missão.', $this->church->mission_whatsapp_default_message);
    }

    public function test_mission_volunteer_detail_includes_whatsapp_default_message(): void
    {
        $this->church->update(['mission_whatsapp_default_message' => 'Texto configurado.']);

        $phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Acolhimento',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);

        $volunteer = MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Edvaldo Jose de Oliveira',
            'phone' => '51980880481',
            'lgpd_consent' => true,
        ]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->getJson(route('mission.volunteers.detail', $volunteer))
            ->assertOk()
            ->assertJsonPath('whatsappDefaultMessage', 'Texto configurado.')
            ->assertJsonPath('volunteer.fullName', 'Edvaldo Jose de Oliveira');
    }
}
