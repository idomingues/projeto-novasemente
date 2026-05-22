<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerPipelineLeadTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $this->seed();

        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'admin']);
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_update_ministry_leader_status_from_pipeline(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Status Pipeline',
            'email' => 'status.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ])->assertRedirect('/volunteers');

        $volunteer = Volunteer::query()->where('email', 'status.pipeline@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'training',
                'leader_note' => '',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $invitation = VolunteerMinistryInvitation::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->first();

        $this->assertNotNull($invitation);
        $this->assertSame('training', $invitation->leader_status);

        $this->assertDatabaseHas('volunteer_ministry_invitation_status_histories', [
            'invitation_id' => $invitation->id,
            'to_status' => 'training',
        ]);
    }

    public function test_pipeline_detail_includes_editable_status_sections_for_admin(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Detalhe Pipeline',
            'email' => 'detalhe.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'detalhe.pipeline@example.com')->firstOrFail();
        $this->assertNotNull($volunteer->user_id);
        $user = User::query()->findOrFail($volunteer->user_id);
        $user->forceFill(['photo_url' => 'https://example.test/media/users/photos/ficha.jpg'])->save();
        $volunteer->forceFill([
            'phone' => '11988887777',
            'gifts_to_develop' => 'Organização',
            'professional_area' => 'Educação',
        ])->save();

        VolunteerMinistryInvitation::query()->create([
            'church_id' => $church->id,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $admin->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => 'active',
            'leader_status_set_by_user_id' => $admin->id,
            'leader_status_set_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson(
            route('ministry-lead.volunteers.pipeline.detail', $volunteer),
        );

        $response->assertOk();
        $stageNames = collect($response->json('stages'))->pluck('name')->map(fn ($n) => mb_strtolower(trim((string) $n)))->all();
        $this->assertContains('interessado', $stageNames);
        $this->assertContains('encaminhado', $stageNames);
        $this->assertContains('finalizado', $stageNames);
        $this->assertNotContains('recusado pelo voluntário', $stageNames);
        $this->assertNotContains('recusado pelo líder', $stageNames);
        $response->assertJsonPath('volunteer.photo_url', 'https://example.test/media/users/photos/ficha.jpg');
        $response->assertJsonPath('volunteer.phone', '11988887777');
        $response->assertJsonPath('volunteer.gifts_to_develop', 'Organização');
        $sections = $response->json('statusHistoryByMinistry');
        $this->assertIsArray($sections);
        $this->assertNotEmpty($sections);

        $section = collect($sections)->firstWhere('ministryId', $ministry->id);
        $this->assertNotNull($section);
        $this->assertTrue($section['canEdit']);
        $this->assertNotEmpty($section['updateLeaderStatusUrl']);
    }

    public function test_denied_leader_status_requires_note(): void
    {
        $admin = $this->actingAsAdmin();
        $church = Church::query()->firstOrFail();
        $ministry = Ministry::query()->where('church_id', $church->id)->firstOrFail();

        $this->actingAs($admin)->post('/volunteers', [
            'name' => 'Recusa Pipeline',
            'email' => 'recusa.pipeline@example.com',
            'ministry_ids' => [$ministry->id],
            'active' => '1',
            'app_password' => 'secret123',
            'app_password_confirmation' => 'secret123',
        ]);

        $volunteer = Volunteer::query()->where('email', 'recusa.pipeline@example.com')->firstOrFail();

        $response = $this->actingAs($admin)->patch(
            route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministry]),
            [
                'leader_status' => 'denied',
                'leader_note' => 'ok',
            ],
        );

        $response->assertRedirect();
        $response->assertSessionHasErrors(['leader_note']);

        $this->assertSame(
            0,
            VolunteerMinistryInvitationStatusHistory::query()
                ->where('volunteer_id', $volunteer->id)
                ->where('ministry_id', $ministry->id)
                ->count(),
        );
    }
}
