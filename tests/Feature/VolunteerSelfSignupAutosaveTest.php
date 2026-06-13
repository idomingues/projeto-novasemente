<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CompleteVolunteerSignup;
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
                'autosave_fields' => ['attendance_duration', 'has_social_networks', 'social_network_profiles'],
                'attendance_duration' => 'years_1_2',
                'has_social_networks' => true,
                'social_network_profiles' => '@maria.ns',
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', false)
            ->assertJsonStructure(['message', 'completion', 'initial']);

        $volunteer->refresh();
        $this->assertSame('years_1_2', $volunteer->attendance_duration);
        $this->assertTrue($volunteer->has_social_networks);
        $this->assertSame('@maria.ns', $volunteer->social_network_profiles);

        $user->refresh();
        $this->assertFalse($user->is_volunteer);
    }

    public function test_autosave_does_not_mark_user_as_volunteer_until_signup_is_complete(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Pedro Souza',
            'email' => 'pedro.autosave@example.com',
            'photo_url' => 'https://example.com/photos/pedro.jpg',
        ]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['attendance_duration', 'has_social_networks', 'social_network_profiles'],
                'attendance_duration' => 'years_1_2',
                'has_social_networks' => true,
                'social_network_profiles' => '@pedro.ns',
            ])
            ->assertOk();

        $this->assertFalse($user->fresh()->is_volunteer);
        $this->assertTrue($user->fresh()->hasVolunteerSignupInProgress());
    }

    public function test_guest_cannot_autosave_volunteer_signup(): void
    {
        $this->postJson(route('volunteers.self-signup.autosave'), [
            'autosave_fields' => ['attendance_duration'],
            'attendance_duration' => 'years_1_2',
        ])->assertUnauthorized();
    }

    public function test_autosave_service_ease_areas_persists_json_slugs(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Ana Souza',
            'email' => 'ana.areas@example.com',
            'photo_url' => 'https://example.com/photos/ana.jpg',
        ]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['service_ease_areas'],
                'first_name' => 'Ana',
                'last_name' => 'Souza',
                'service_ease_areas' => ['music', 'reception'],
            ])
            ->assertOk()
            ->assertJsonPath('initial.service_ease_areas', ['music', 'reception']);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $this->assertSame(['music', 'reception'], \App\Support\VolunteerSignupServiceEaseAreas::decode($volunteer->service_ease_areas));
    }

    public function test_partial_autosave_does_not_clear_existing_birth_date(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Fabio Silva',
            'email' => 'fabio.birth@example.com',
            'photo_url' => 'https://example.com/photos/fabio.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->forceFill([
            'birth_date' => '1990-03-15',
            'attendance_duration' => 'years_1_2',
            'has_social_networks' => true,
            'social_network_profiles' => '@fabio.ns',
        ])->save();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['volunteer_phase'],
                'first_name' => 'Fabio',
                'last_name' => 'Silva',
                'volunteer_phase' => 'active',
            ])
            ->assertOk();

        $volunteer->refresh();
        $this->assertSame('1990-03-15', $volunteer->birth_date?->format('Y-m-d'));
        $this->assertSame('years_1_2', $volunteer->attendance_duration);
        $this->assertTrue($volunteer->has_social_networks);
        $this->assertSame('active', $volunteer->volunteer_phase);
    }
}
