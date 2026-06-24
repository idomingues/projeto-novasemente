<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\VolunteerMinistryInvitation;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerSignupMinistryIntentTest extends TestCase
{
    use RefreshDatabase;

    public function test_signup_completion_creates_pending_invitations_without_attaching_ministry(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->create([
            'church_id' => $churchId,
            'name' => 'Recepção',
        ]);

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Carla Souza',
            'email' => 'carla.ministry.intent@example.com',
            'photo_url' => 'https://example.com/photos/carla.jpg',
        ]);

        $payload = array_merge($this->basePayload(), [
            'desired_ministry_ids' => [(int) $ministry->id],
        ]);

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), $payload)
            ->assertRedirect();

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $this->assertFalse($volunteer->ministries()->where('ministries.id', $ministry->id)->exists());

        $invitation = VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->first();

        $this->assertNotNull($invitation);
        $this->assertSame('pending', $invitation->status);
        $this->assertNull($invitation->leader_status);

        $pipeline = $volunteer->churchPipelines()->where('church_id', $churchId)->first();
        $this->assertNotNull($pipeline);
        $stageName = mb_strtolower(trim((string) $pipeline->stage?->name));
        $this->assertSame('interessado', $stageName);
    }

    /**
     * @return array<string, mixed>
     */
    private function basePayload(): array
    {
        return [
            'first_name' => 'Carla',
            'last_name' => 'Souza',
            'birth_date' => '1990-01-15',
            'has_whatsapp' => true,
            'email' => 'carla.ministry.intent@example.com',
            'phone' => '11999990000',
            'has_social_networks' => true,
            'social_network_profiles' => '@carla.ns',
            'professional_area' => 'Administração',
            'attendance_duration' => 'more_than_5_years',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'desired_ministry_ids' => [],
            'service_ease_areas' => ['administration'],
            'service_activity_types' => ['technical_production'],
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Organização',
            'service_greatest_challenge' => 'Tempo',
            'lgpd_data_consent' => true,
        ];
    }
}
