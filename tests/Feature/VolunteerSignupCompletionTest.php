<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Support\VolunteerSignupCompletion;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VolunteerSignupCompletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_incomplete_volunteer_profile_reports_missing_fields(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Maria',
            'email' => 'maria@example.com',
        ]);

        $completion = VolunteerSignupCompletion::forUser($user);

        $this->assertFalse($completion['is_complete']);
        $this->assertGreaterThan(0, $completion['missing_count']);
        $this->assertContains('full_name', $completion['missing_fields']);
        $this->assertContains('birth_date', $completion['missing_fields']);
        $this->assertNotContains('password', $completion['missing_fields']);
        $this->assertNotContains('current_password', $completion['missing_fields']);
    }

    public function test_invalid_birth_date_counts_as_missing(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Ana Silva',
            'email' => 'ana@example.com',
            'photo_url' => 'https://example.com/photos/ana.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $volunteer->forceFill([
            'birth_date' => now()->toDateString(),
            'has_whatsapp' => true,
            'has_social_networks' => true,
            'attendance_duration' => 'years_1_3',
            'is_official_member' => false,
            'has_previous_ministry_volunteer_experience' => false,
            'ministry_involvement' => 'Não',
            'other_ministry_interest' => 'Não',
            'lgpd_data_consent' => true,
        ])->save();

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertFalse($completion['is_complete']);
        $this->assertSame(1, $completion['missing_count']);
        $this->assertSame(['birth_date'], $completion['missing_fields']);
    }

    public function test_complete_volunteer_profile_reports_one_hundred_percent(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'João Silva',
            'email' => 'joao@example.com',
            'photo_url' => 'https://example.com/photos/joao.jpg',
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

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertTrue($completion['is_complete']);
        $this->assertSame(0, $completion['missing_count']);
        $this->assertSame(100, $completion['percent']);
    }

    public function test_mobile_home_shows_incomplete_volunteer_signup_alert(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Maria',
            'email' => 'maria.home@example.com',
        ]);

        $this->actingAs($user)
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->has('volunteerSignupCompletion')
                ->where('volunteerSignupCompletion.is_complete', false)
                ->where('volunteerSignupCompletion.missing_count', fn ($count) => $count > 0));
    }

    public function test_mobile_profile_edit_hides_volunteer_card_when_signup_is_complete(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'João Silva',
            'email' => 'joao.perfil@example.com',
            'photo_url' => 'https://example.com/photos/joao.jpg',
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
            ->get(route('mobile.profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/ProfileEdit')
                ->where('volunteerSignupCompletion', null));
    }

    public function test_mobile_home_hides_alert_when_volunteer_signup_is_complete(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'João Silva',
            'email' => 'joao.home@example.com',
            'photo_url' => 'https://example.com/photos/joao.jpg',
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
            ->get(route('mobile.home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/Home')
                ->where('volunteerSignupCompletion', null));
    }
}
