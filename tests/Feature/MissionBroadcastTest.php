<?php

namespace Tests\Feature;

use App\Mail\MissionVolunteerBroadcastMail;
use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\UserInboxNotification;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MissionBroadcastTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    private MissionPhase $phase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');

        $this->phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Interessado',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);
    }

    public function test_admin_can_broadcast_to_filtered_mission_volunteers(): void
    {
        Mail::fake();

        $appUser = User::factory()->create([
            'church_id' => $this->church->id,
            'email' => 'comapp@example.com',
            'notify_via_app' => true,
            'notify_via_email' => true,
        ]);

        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Com App',
            'phone' => '11999990001',
            'email' => 'comapp@example.com',
            'lgpd_consent' => true,
        ]);

        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Só Email',
            'phone' => '11999990002',
            'email' => 'soemail@example.com',
            'lgpd_consent' => true,
        ]);

        $response = $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->post(route('mission.broadcast.store'), [
                'title' => 'Aviso Missão',
                'body' => 'Mensagem para o filtro.',
                'send_email' => true,
                'send_app' => true,
                'mission_phase_id' => (string) $this->phase->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Mail::assertSent(MissionVolunteerBroadcastMail::class, 2);
        $this->assertSame(1, UserInboxNotification::query()->where('user_id', $appUser->id)->count());
    }

    public function test_broadcast_requires_at_least_one_channel(): void
    {
        MissionVolunteer::query()->create([
            'church_id' => $this->church->id,
            'mission_phase_id' => $this->phase->id,
            'phase_entered_at' => now(),
            'full_name' => 'Teste',
            'phone' => '11999990003',
            'lgpd_consent' => true,
        ]);

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->post(route('mission.broadcast.store'), [
                'title' => 'Aviso',
                'body' => 'Corpo',
                'send_email' => false,
                'send_app' => false,
            ])
            ->assertRedirect()
            ->assertSessionHas('error');
    }
}
