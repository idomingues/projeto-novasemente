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
        $this->assertTrue($user->is_volunteer, 'Autosave incompleto deve manter is_volunteer já existente.');
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

    public function test_autosave_has_whatsapp_when_phone_only_on_client_form(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Simone Ribeiro',
            'email' => 'simone.whatsapp@example.com',
            'photo_url' => 'https://example.com/photos/simone.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->forceFill([
            'phone' => null,
            'has_whatsapp' => null,
        ])->save();

        // Telefone ainda só no formulário (não gravado); vai no body do autosave do WhatsApp.
        $this->actingAs($user)
            ->post(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => json_encode(['has_whatsapp', 'phone', 'first_name', 'last_name']),
                'first_name' => 'Simone',
                'last_name' => 'Ribeiro',
                'has_whatsapp' => '1',
                'phone' => '11971592583',
            ])
            ->assertOk()
            ->assertJsonPath('initial.has_whatsapp', true)
            ->assertJsonPath('initial.phone', '11971592583');

        $volunteer->refresh();
        $this->assertTrue($volunteer->has_whatsapp);
        $this->assertSame('11971592583', $volunteer->phone);
        $this->assertTrue($user->fresh()->hasVolunteerSignupInProgress());
    }

    public function test_autosave_has_whatsapp_without_phone_in_request_keeps_selection_when_phone_on_server(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Simone Ribeiro',
            'email' => 'simone.whatsapp2@example.com',
            'photo_url' => 'https://example.com/photos/simone2.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->forceFill([
            'phone' => '11971592583',
            'has_whatsapp' => null,
        ])->save();

        $this->actingAs($user)
            ->post(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => json_encode(['has_whatsapp', 'first_name', 'last_name']),
                'first_name' => 'Simone',
                'last_name' => 'Ribeiro',
                'has_whatsapp' => '1',
            ])
            ->assertOk()
            ->assertJsonPath('initial.has_whatsapp', true);

        $this->assertTrue($volunteer->fresh()->has_whatsapp);
        $this->assertTrue($user->fresh()->hasVolunteerSignupInProgress());
    }

    public function test_autosave_has_whatsapp_false_is_kept_as_signup_draft(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Simone Ribeiro',
            'email' => 'simone.whatsapp3@example.com',
            'photo_url' => 'https://example.com/photos/simone3.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->forceFill([
            'phone' => '11971592583',
            'has_whatsapp' => null,
        ])->save();

        $this->actingAs($user)
            ->post(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => json_encode(['has_whatsapp', 'first_name', 'last_name']),
                'first_name' => 'Simone',
                'last_name' => 'Ribeiro',
                'has_whatsapp' => '0',
            ])
            ->assertOk()
            ->assertJsonPath('initial.has_whatsapp', false);

        $this->assertFalse($volunteer->fresh()->has_whatsapp);
        $this->assertTrue($user->fresh()->hasVolunteerSignupInProgress());
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

    public function test_autosave_marks_signup_complete_when_last_required_field_is_saved(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Lúcia Completa',
            'email' => 'lucia.completa@example.com',
            'photo_url' => 'https://example.com/photos/lucia.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        CompleteVolunteerSignup::apply($user, $volunteer);
        $volunteer->forceFill(['lgpd_data_consent' => false])->save();
        $user->forceFill(['is_volunteer' => false])->save();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['lgpd_data_consent'],
                'first_name' => 'Lúcia',
                'last_name' => 'Completa',
                'lgpd_data_consent' => true,
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', true)
            ->assertJsonPath('message', 'Cadastro de voluntário concluído.');

        $this->assertTrue($volunteer->fresh()->lgpd_data_consent);
        $this->assertTrue((bool) $user->fresh()->is_volunteer);
    }

    public function test_incomplete_autosave_does_not_clear_existing_is_volunteer_flag(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Marina Flag',
            'email' => 'marina.flag@example.com',
            'photo_url' => 'https://example.com/photos/marina.jpg',
        ]);

        $user->ensureVolunteerProfile();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['volunteer_phase'],
                'first_name' => 'Marina',
                'last_name' => 'Flag',
                'volunteer_phase' => 'interested',
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', false);

        $this->assertTrue((bool) $user->fresh()->is_volunteer);
    }

    public function test_autosave_rejects_lgpd_consent_false(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Rafael Completa',
            'email' => 'rafael.lgpd@example.com',
            'photo_url' => 'https://example.com/photos/rafael.jpg',
        ]);

        $user->ensureVolunteerProfile();
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);

        CompleteVolunteerSignup::apply($user, $volunteer);
        $volunteer->forceFill(['lgpd_data_consent' => false])->save();

        $this->actingAs($user)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['lgpd_data_consent'],
                'first_name' => 'Rafael',
                'last_name' => 'Completa',
                'lgpd_data_consent' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lgpd_data_consent']);

        $this->assertFalse($volunteer->fresh()->lgpd_data_consent);
    }
}
