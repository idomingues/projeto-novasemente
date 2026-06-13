<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\VolunteerSignupMinistryMapper;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\MinistrySeeder;
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
                'autosave_fields' => ['attendance_duration', 'has_social_networks'],
                'attendance_duration' => 'years_1_3',
                'has_social_networks' => true,
            ])
            ->assertOk();

        $this->assertFalse($user->fresh()->is_volunteer);
        $this->assertTrue($user->fresh()->hasVolunteerSignupInProgress());
    }

    public function test_guest_cannot_autosave_volunteer_signup(): void
    {
        $this->postJson(route('volunteers.self-signup.autosave'), [
            'autosave_fields' => ['attendance_duration'],
            'attendance_duration' => 'years_1_3',
        ])->assertUnauthorized();
    }

    public function test_autosave_is_active_in_ministry_without_ministry_ids_does_not_detach_existing_departments(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->where('church_id', $churchId)->orderBy('name')->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Fabio Silva',
            'email' => 'fabio.autosave@example.com',
            'photo_url' => 'https://example.com/photos/fabio.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->ministries()->sync([$ministry->id]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['is_active_in_ministry'],
                'first_name' => 'Fabio',
                'last_name' => 'Silva',
                'is_active_in_ministry' => true,
            ])
            ->assertOk()
            ->assertJsonPath('initial.is_active_in_ministry', true);

        $volunteer->refresh();
        $this->assertTrue($volunteer->ministries()->whereKey($ministry->id)->exists());
        $this->assertNotNull($volunteer->ministry_involvement);
        $this->assertNotSame('Não', (string) $volunteer->ministry_involvement);
    }

    public function test_autosave_yes_to_active_ministry_keeps_yes_in_form_prefill_before_picking_departments(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Ana Souza',
            'email' => 'ana.ministry@example.com',
            'photo_url' => 'https://example.com/photos/ana.jpg',
        ]);

        $user->ensureVolunteerProfile();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['is_active_in_ministry'],
                'first_name' => 'Ana',
                'last_name' => 'Souza',
                'is_active_in_ministry' => true,
            ])
            ->assertOk()
            ->assertJsonPath('initial.is_active_in_ministry', true)
            ->assertJsonPath('initial.active_ministry_ids', []);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $this->assertSame(VolunteerSignupMinistryMapper::YES_AWAITING_MINISTRY_PICK, $volunteer->ministry_involvement);
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
            'attendance_duration' => 'years_1_3',
            'has_social_networks' => true,
        ])->save();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['is_active_in_ministry'],
                'first_name' => 'Fabio',
                'last_name' => 'Silva',
                'is_active_in_ministry' => false,
            ])
            ->assertOk();

        $volunteer->refresh();
        $this->assertSame('1990-03-15', $volunteer->birth_date?->format('Y-m-d'));
        $this->assertSame('years_1_3', $volunteer->attendance_duration);
        $this->assertTrue($volunteer->has_social_networks);
        $this->assertSame('Não', $volunteer->ministry_involvement);
    }
}
