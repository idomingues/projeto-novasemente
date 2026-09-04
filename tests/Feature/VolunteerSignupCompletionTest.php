<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Support\VolunteerSignupCompletion;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CompleteVolunteerSignup;
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
        foreach (VolunteerSignupCompletion::OPTIONAL_FIELD_KEYS as $optional) {
            $this->assertNotContains($optional, $completion['missing_fields'], "Campo opcional {$optional} não deve aparecer como pendente.");
        }
    }

    public function test_social_profiles_required_when_user_uses_social_networks(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Carlos Souza',
            'email' => 'carlos.social@example.com',
            'photo_url' => 'https://example.com/photos/carlos.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        $volunteer->forceFill([
            'birth_date' => '1985-03-10',
            'phone' => '11999990000',
            'has_whatsapp' => true,
            'has_social_networks' => true,
            'social_network_profiles' => '',
            'professional_area' => 'Administração',
            'attendance_duration' => 'years_1_2',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'service_ease_areas' => json_encode(['administration']),
            'service_activity_types' => json_encode(['professional_expertise']),
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Comunicação',
            'service_greatest_challenge' => 'Disponibilidade',
            'lgpd_data_consent' => true,
        ])->save();

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertFalse($completion['is_complete']);
        $this->assertSame(['social_network_profiles'], $completion['missing_fields']);
    }

    public function test_existing_volunteer_without_phone_is_not_incomplete(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Paula Lima',
            'email' => 'paula.sem.telefone@example.com',
            'photo_url' => 'https://example.com/photos/paula.jpg',
        ]);

        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        CompleteVolunteerSignup::apply($user, $volunteer);
        $user->forceFill(['phone' => null])->save();
        $volunteer->forceFill(['phone' => null, 'has_whatsapp' => null])->save();

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertTrue($completion['is_complete']);
        $this->assertNotContains('phone', $completion['missing_fields']);
        $this->assertNotContains('has_whatsapp', $completion['missing_fields']);
    }

    public function test_new_signup_completion_still_requires_phone(): void
    {
        $completion = VolunteerSignupCompletion::fromInitial([
            'require_phone' => true,
            'has_existing_photo' => true,
            'full_name' => 'Novo Voluntário',
            'birth_date' => '1990-01-15',
            'phone' => '',
            'has_whatsapp' => null,
            'email' => 'novo.voluntario@example.com',
            'has_social_networks' => false,
            'social_network_profiles' => '',
            'professional_area' => 'Educação',
            'attendance_duration' => 'years_1_2',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'service_ease_areas' => ['music'],
            'service_activity_types' => ['adults_direct'],
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Comunicação',
            'service_greatest_challenge' => 'Horário',
            'lgpd_data_consent' => true,
        ]);

        $this->assertFalse($completion['is_complete']);
        $this->assertContains('phone', $completion['missing_fields']);
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

        CompleteVolunteerSignup::apply($user, $volunteer);
        $volunteer->forceFill(['birth_date' => now()->toDateString()])->save();

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertFalse($completion['is_complete']);
        $this->assertSame(1, $completion['missing_count']);
        $this->assertSame(['birth_date'], $completion['missing_fields']);
        $this->assertTrue(VolunteerSignupCompletion::onlyBirthDateMissing($completion));
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

        CompleteVolunteerSignup::apply($user, $volunteer);

        $completion = VolunteerSignupCompletion::forUser($user->fresh());

        $this->assertTrue($completion['is_complete']);
        $this->assertSame(0, $completion['missing_count']);
        $this->assertSame(100, $completion['percent']);
    }

    public function test_mobile_home_does_not_show_volunteer_signup_alert(): void
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
                ->missing('volunteerSignupCompletion'));
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

        CompleteVolunteerSignup::apply($user, $volunteer);

        $this->actingAs($user)
            ->get(route('mobile.profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/ProfileEdit')
                ->where('volunteerSignupCompletion', null));
    }

    public function test_mobile_profile_edit_hides_signup_alert_for_non_volunteer_with_draft(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Ana Lima',
            'email' => 'ana.perfil@example.com',
            'photo_url' => 'https://example.com/photos/ana.jpg',
        ]);

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['attendance_duration'],
                'attendance_duration' => 'years_1_2',
            ])
            ->assertOk();

        $this->actingAs($user)
            ->get(route('mobile.profile.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/ProfileEdit')
                ->where('volunteerSignupCompletion', null));
    }

    public function test_describe_missing_fields_returns_readable_labels(): void
    {
        $text = VolunteerSignupCompletion::describeMissingFields(['full_name', 'lgpd_data_consent']);

        $this->assertStringContainsString('Nome completo', $text);
        $this->assertStringContainsString('LGPD', $text);
    }

}
