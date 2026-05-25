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
}
