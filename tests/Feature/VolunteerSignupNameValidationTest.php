<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Support\VolunteerSignupName;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerSignupNameValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_split_requires_first_and_last_name(): void
    {
        $this->assertNull(VolunteerSignupName::split('Admin'));
        $this->assertNull(VolunteerSignupName::split('Maria'));
        $this->assertSame(
            ['first_name' => 'João', 'last_name' => 'Silva'],
            VolunteerSignupName::split('João Silva')
        );
        $this->assertSame(
            ['first_name' => 'Ivanildo', 'last_name' => 'Domingues'],
            VolunteerSignupName::split("Ivanildo\u{00a0}Domingues")
        );
        $this->assertSame(
            ['first_name' => 'Ivanildo', 'last_name' => 'Domingues Santos'],
            VolunteerSignupName::split('Ivanildo Domingues Santos')
        );
    }

    public function test_self_signup_update_rejects_single_word_name_with_friendly_message(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Admin',
            'email' => 'admin.nome@example.com',
            'photo_url' => 'https://example.com/photos/admin.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $volunteer->forceFill([
            'birth_date' => '1988-05-20',
            'has_whatsapp' => true,
            'has_social_networks' => true,
            'attendance_duration' => 'years_1_3',
            'is_official_member' => false,
            'has_previous_ministry_volunteer_experience' => false,
            'ministry_involvement' => 'Não',
            'other_ministry_interest' => 'Não',
            'lgpd_data_consent' => true,
        ])->save();

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), [
                'first_name' => 'Admin',
                'last_name' => '',
                'birth_date' => '1988-05-20',
                'has_whatsapp' => true,
                'email' => 'admin.nome@example.com',
                'phone' => '',
                'has_social_networks' => true,
                'attendance_duration' => 'years_1_3',
                'is_official_member' => false,
                'has_previous_ministry_volunteer_experience' => false,
                'is_active_in_ministry' => false,
                'wants_other_ministry' => false,
                'lgpd_data_consent' => true,
                'redirect_after_save' => 'mobile.profile.edit',
            ])
            ->assertSessionHasErrors(['full_name'])
            ->assertSessionHasErrors([
                'full_name' => VolunteerSignupName::FULL_NAME_REQUIRED_MESSAGE,
            ]);
    }

    public function test_autosave_accepts_name_from_form_when_only_photo_field_requested(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ivanildo',
            'email' => 'ivanildo.autosave@example.com',
            'photo_url' => 'https://example.com/photos/ivanildo.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['photo_file'],
                'first_name' => 'Ivanildo',
                'last_name' => 'Domingues',
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame('Ivanildo Domingues', $user->name);
    }

    public function test_autosave_photo_only_does_not_fail_when_name_still_incomplete_in_database(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ivanildo',
            'email' => 'ivanildo.foto@example.com',
            'photo_url' => 'https://example.com/photos/ivanildo.jpg',
        ]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['has_whatsapp'],
                'has_whatsapp' => true,
            ])
            ->assertOk();

        $user->refresh();
        $this->assertSame('Ivanildo', $user->name);
    }

    public function test_autosave_stage_one_fields_persists_full_name(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ivanildo',
            'email' => 'ivanildo.etapa1@example.com',
            'photo_url' => 'https://example.com/photos/ivanildo.jpg',
        ]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['first_name', 'last_name', 'birth_date'],
                'first_name' => 'Ivanildo',
                'last_name' => 'Domingues',
                'birth_date' => '1977-09-10',
            ])
            ->assertOk()
            ->assertJsonPath('initial.full_name', 'Ivanildo Domingues');

        $user->refresh();
        $this->assertSame('Ivanildo Domingues', $user->name);
        $this->assertSame('1977-09-10', $user->fresh()->volunteerProfile?->birth_date?->format('Y-m-d'));
    }

    public function test_self_signup_update_accepts_compound_surname(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Maria',
            'email' => 'maria.santos@example.com',
            'photo_url' => 'https://example.com/photos/maria.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $volunteer->forceFill([
            'birth_date' => '1990-03-15',
            'has_whatsapp' => true,
            'has_social_networks' => true,
            'attendance_duration' => 'years_1_3',
            'is_official_member' => false,
            'has_previous_ministry_volunteer_experience' => false,
            'ministry_involvement' => 'Não',
            'other_ministry_interest' => 'Não',
            'lgpd_data_consent' => true,
        ])->save();

        $this->actingAs($user)
            ->put(route('volunteers.self-signup.edit.update'), [
                'first_name' => 'Maria',
                'last_name' => 'Oliveira Santos',
                'birth_date' => '1990-03-15',
                'has_whatsapp' => true,
                'email' => 'maria.santos@example.com',
                'phone' => '',
                'has_social_networks' => true,
                'attendance_duration' => 'years_1_3',
                'is_official_member' => false,
                'has_previous_ministry_volunteer_experience' => false,
                'is_active_in_ministry' => false,
                'wants_other_ministry' => false,
                'lgpd_data_consent' => true,
                'redirect_after_save' => 'mobile.profile.edit',
            ])
            ->assertRedirect(route('mobile.profile.edit', absolute: false));

        $user->refresh();
        $this->assertSame('Maria Oliveira Santos', $user->name);
    }
}
