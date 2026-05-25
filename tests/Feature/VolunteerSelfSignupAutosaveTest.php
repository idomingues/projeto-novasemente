<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerSelfSignupAutosaveTest extends TestCase
{
    use RefreshDatabase;

    public function test_autosave_persists_single_answer_and_returns_updated_completion(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Maria Souza',
            'email' => 'maria.autosave@example.com',
            'photo_url' => 'https://example.com/photos/maria.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['attendance_duration', 'has_social_networks'],
                'attendance_duration' => 'years_1_3',
                'has_social_networks' => true,
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', false)
            ->assertJsonStructure(['message', 'completion', 'initial']);

        $volunteer->refresh();
        $this->assertSame('years_1_3', $volunteer->attendance_duration);
        $this->assertTrue($volunteer->has_social_networks);
    }

    public function test_guest_cannot_autosave_volunteer_signup(): void
    {
        $this->postJson(route('volunteers.self-signup.autosave'), [
            'autosave_fields' => ['attendance_duration'],
            'attendance_duration' => 'years_1_3',
        ])->assertUnauthorized();
    }
}
