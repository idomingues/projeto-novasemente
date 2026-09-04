<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\VolunteerSelfSignupToken;
use App\Support\VolunteerSignupCompletion;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\MinistrySeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Tests\Support\CompleteVolunteerSignup;
use Tests\TestCase;

/**
 * Simula entradas de cadastro de voluntário em situações distintas
 * (público completo, edição parcial, autosave, flags, campos que mais travavam).
 */
class VolunteerSignupScenariosSimulationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{churchId: int, token: string}
     */
    private function bootChurchAndToken(): array
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        return ['churchId' => $churchId, 'token' => $token];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function publicPayload(string $token, string $email, array $overrides = []): array
    {
        return array_merge([
            'token' => $token,
            'photo_file' => UploadedFile::fake()->image('foto.jpg'),
            'first_name' => 'Maria',
            'last_name' => 'Silva',
            'birth_date' => '1990-01-15',
            'has_whatsapp' => true,
            'email' => $email,
            'phone' => '11999998888',
            'has_social_networks' => true,
            'social_network_profiles' => '@maria.ns',
            'professional_area' => 'Administração',
            'attendance_duration' => 'years_1_2',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'service_ease_areas' => ['reception', 'communication'],
            'service_activity_types' => ['adults_direct'],
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Acolhimento',
            'service_greatest_challenge' => 'Disponibilidade de tempo',
            'lgpd_data_consent' => true,
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
        ], $overrides);
    }

    public function test_simulates_ten_volunteer_signup_entry_situations(): void
    {
        ['churchId' => $churchId, 'token' => $token] = $this->bootChurchAndToken();
        $outcomes = [];

        // 1) Cadastro público completo (convidado)
        $this->post(
            route('volunteers.self-signup.store'),
            $this->publicPayload($token, 'sim.completo@example.com', [
                'first_name' => 'Ana',
                'last_name' => 'Completa',
            ])
        )->assertRedirect(route('login', absolute: false));

        $user1 = User::query()->where('email', 'sim.completo@example.com')->firstOrFail();
        $this->assertTrue((bool) $user1->is_volunteer);
        $this->assertTrue(VolunteerSignupCompletion::forUser($user1)['is_complete']);
        $outcomes[] = '1_public_complete';

        // 2) Público sem redes sociais (perfil social não obrigatório)
        $this->post(
            route('volunteers.self-signup.store'),
            $this->publicPayload($token, 'sim.sem.rede@example.com', [
                'first_name' => 'Bruno',
                'last_name' => 'Offline',
                'has_social_networks' => false,
                'social_network_profiles' => '',
                'phone' => '11988887777',
            ])
        )->assertRedirect(route('login', absolute: false));

        $user2 = User::query()->where('email', 'sim.sem.rede@example.com')->firstOrFail();
        $this->assertTrue(VolunteerSignupCompletion::forUser($user2)['is_complete']);
        $outcomes[] = '2_public_no_social';

        // 3) Voluntário legado incompleto: só falta service_activity_types (caso típico pós-jun/2026)
        $user3 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Carla Quase',
            'email' => 'sim.quase.atividade@example.com',
            'photo_url' => 'https://example.com/photos/carla.jpg',
        ]);
        $user3->ensureVolunteerProfile();
        $volunteer3 = $user3->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer3);
        CompleteVolunteerSignup::apply($user3, $volunteer3);
        $volunteer3->forceFill(['service_activity_types' => null])->save();
        $this->assertSame(['service_activity_types'], VolunteerSignupCompletion::forUser($user3->fresh())['missing_fields']);

        $this->actingAs($user3)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['service_activity_types'],
                'first_name' => 'Carla',
                'last_name' => 'Quase',
                'service_activity_types' => ['technical_production'],
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', true);

        $this->assertTrue((bool) $user3->fresh()->is_volunteer);
        $outcomes[] = '3_autosave_last_activity_types';

        // 4) Autosave parcial NÃO pode zerar is_volunteer (paradoxo do banner)
        $user4 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Diego Banner',
            'email' => 'sim.banner@example.com',
            'photo_url' => 'https://example.com/photos/diego.jpg',
        ]);
        $user4->ensureVolunteerProfile();

        $this->actingAs($user4)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['volunteer_phase'],
                'first_name' => 'Diego',
                'last_name' => 'Banner',
                'volunteer_phase' => 'interested',
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', false);

        $this->assertTrue((bool) $user4->fresh()->is_volunteer, 'Autosave incompleto não pode limpar is_volunteer.');
        $this->assertNotNull(VolunteerSignupCompletion::profileAlertForUser($user4->fresh()));
        $outcomes[] = '4_incomplete_keeps_is_volunteer_and_banner';

        // 5) Opt-in novo (não voluntário): rascunho sem banner até completar / marcar flag
        $user5 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => false,
            'name' => 'Elena Optin',
            'email' => 'sim.optin@example.com',
            'photo_url' => 'https://example.com/photos/elena.jpg',
        ]);

        $this->actingAs($user5)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['professional_area'],
                'first_name' => 'Elena',
                'last_name' => 'Optin',
                'professional_area' => 'Educação',
            ])
            ->assertOk();

        $this->assertFalse((bool) $user5->fresh()->is_volunteer);
        $this->assertNull(VolunteerSignupCompletion::profileAlertForUser($user5->fresh()));
        $outcomes[] = '5_non_volunteer_draft_no_banner';

        // 6) Completar via PUT edição autenticada
        $user6 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Fábio Edição',
            'email' => 'sim.edicao@example.com',
            'photo_url' => 'https://example.com/photos/fabio.jpg',
        ]);
        $user6->ensureVolunteerProfile();
        $volunteer6 = $user6->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer6);
        CompleteVolunteerSignup::apply($user6, $volunteer6);
        $volunteer6->forceFill([
            'service_ease_areas' => null,
            'service_activity_types' => null,
            'service_greatest_strength' => null,
            'service_greatest_challenge' => null,
        ])->save();

        $this->actingAs($user6)
            ->put(route('volunteers.self-signup.edit.update'), [
                'first_name' => 'Fábio',
                'last_name' => 'Edição',
                'birth_date' => '1988-05-20',
                'has_whatsapp' => true,
                'email' => 'sim.edicao@example.com',
                'phone' => '11977776666',
                'has_social_networks' => true,
                'social_network_profiles' => '@fabio.ns',
                'professional_area' => 'Tecnologia',
                'attendance_duration' => 'years_1_2',
                'is_official_member' => false,
                'volunteer_phase' => 'in_training',
                'service_ease_areas' => ['technology'],
                'service_activity_types' => ['strategy_planning'],
                'comfortable_with_digital_tools' => true,
                'service_greatest_strength' => 'Planejamento',
                'service_greatest_challenge' => 'Priorizar',
                'lgpd_data_consent' => true,
            ])
            ->assertRedirect();

        $this->assertTrue(VolunteerSignupCompletion::forUser($user6->fresh())['is_complete']);
        $outcomes[] = '6_authenticated_put_complete';

        // 7) Autosave de áreas de facilidade (multi-select que antes só salvava no Avançar)
        $user7 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Gabi Áreas',
            'email' => 'sim.areas@example.com',
            'photo_url' => 'https://example.com/photos/gabi.jpg',
        ]);
        $user7->ensureVolunteerProfile();
        $volunteer7 = $user7->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer7);
        CompleteVolunteerSignup::apply($user7, $volunteer7);
        $volunteer7->forceFill(['service_ease_areas' => null])->save();

        $this->actingAs($user7)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['service_ease_areas'],
                'first_name' => 'Gabi',
                'last_name' => 'Áreas',
                'service_ease_areas' => ['music', 'reception'],
            ])
            ->assertOk()
            ->assertJsonPath('initial.service_ease_areas', ['music', 'reception']);

        $outcomes[] = '7_autosave_ease_areas';

        // 8) Sem telefone: voluntário já existente não fica incompleto (telefone só obrigatório em cadastro novo)
        $user8 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Helena Semfone',
            'email' => 'sim.semfone@example.com',
            'photo_url' => 'https://example.com/photos/helena.jpg',
        ]);
        $user8->ensureVolunteerProfile();
        $volunteer8 = $user8->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer8);
        CompleteVolunteerSignup::apply($user8, $volunteer8);
        $user8->forceFill(['phone' => null])->save();
        $volunteer8->forceFill(['phone' => null, 'has_whatsapp' => null])->save();

        $completion8 = VolunteerSignupCompletion::forUser($user8->fresh());
        $this->assertTrue($completion8['is_complete']);
        $this->assertNotContains('phone', $completion8['missing_fields']);
        $this->assertNotContains('has_whatsapp', $completion8['missing_fields']);
        $outcomes[] = '8_existing_without_phone_complete';

        // 9) Rede social = sim sem perfil → incompleto; completar perfil via autosave
        $user9 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Igor Social',
            'email' => 'sim.social@example.com',
            'photo_url' => 'https://example.com/photos/igor.jpg',
        ]);
        $user9->ensureVolunteerProfile();
        $volunteer9 = $user9->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer9);
        CompleteVolunteerSignup::apply($user9, $volunteer9);
        $volunteer9->forceFill([
            'has_social_networks' => true,
            'social_network_profiles' => '',
        ])->save();

        $this->assertSame(['social_network_profiles'], VolunteerSignupCompletion::forUser($user9->fresh())['missing_fields']);

        $this->actingAs($user9)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['social_network_profiles'],
                'first_name' => 'Igor',
                'last_name' => 'Social',
                'has_social_networks' => true,
                'social_network_profiles' => '@igor.ns',
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', true);

        $outcomes[] = '9_social_profile_required_then_filled';

        // 10) Atuante + LGPD pendente → concluir LGPD e manter flag
        $user10 = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'name' => 'Joana Lgpd',
            'email' => 'sim.lgpd@example.com',
            'photo_url' => 'https://example.com/photos/joana.jpg',
        ]);
        $user10->ensureVolunteerProfile();
        $volunteer10 = $user10->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer10);
        CompleteVolunteerSignup::apply($user10, $volunteer10);
        $volunteer10->forceFill([
            'volunteer_phase' => 'active',
            'lgpd_data_consent' => false,
        ])->save();

        $this->actingAs($user10)
            ->postJson(route('volunteers.self-signup.autosave'), [
                'autosave_fields' => ['lgpd_data_consent'],
                'first_name' => 'Joana',
                'last_name' => 'Lgpd',
                'lgpd_data_consent' => true,
            ])
            ->assertOk()
            ->assertJsonPath('completion.is_complete', true)
            ->assertJsonPath('message', 'Cadastro de voluntário concluído.');

        $this->assertTrue((bool) $user10->fresh()->is_volunteer);
        $outcomes[] = '10_lgpd_finish_active_volunteer';

        // 11) Extra: público com tipos de atividade técnicos (entrada diferente)
        $this->post('/logout');
        $this->assertGuest();

        $this->post(
            route('volunteers.self-signup.store'),
            $this->publicPayload($token, 'sim.tecnico@example.com', [
                'first_name' => 'Kaique',
                'last_name' => 'Técnico',
                'volunteer_phase' => 'active',
                'service_ease_areas' => ['technology'],
                'service_activity_types' => ['technical_production', 'processes_logistics'],
                'phone' => '11966665555',
            ])
        )->assertRedirect(route('login', absolute: false));

        $user11 = User::query()->where('email', 'sim.tecnico@example.com')->firstOrFail();
        $this->assertTrue(VolunteerSignupCompletion::forUser($user11)['is_complete']);
        $outcomes[] = '11_public_technical_activities';

        $this->assertGreaterThanOrEqual(10, count($outcomes), 'Devem existir pelo menos 10 situações simuladas.');
        $this->assertSame(11, count($outcomes));
    }
}
