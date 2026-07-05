<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MissionAppAccountWizardTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function missionPayload(): array
    {
        return [
            'photo' => UploadedFile::fake()->image('face.jpg', 400, 400),
            'full_name' => 'João Pereira',
            'birth_date' => '1990-03-15',
            'email' => 'joao.missao@example.com',
            'phone' => '11977776666',
            'full_address' => 'Rua das Flores, 100',
            'profession' => 'Enfermeiro(a)',
            'has_belief' => true,
            'belief_which' => 'Cristianismo (Protestantismo / Evangélicos)',
            'participates_religion' => true,
            'religion_which' => 'Igreja Batista',
            'baptized' => true,
            'seeks_in_community' => ['Música/Louvor'],
            'studied_bible' => 'Sim, parcialmente',
            'studied_bible_structured' => false,
            'first_time_nova_semente' => true,
            'first_contact_via' => 'Amigos',
            'wants_bible_study_partner' => 'Sim',
            'spiritual_journey' => 'Tenho interesse em crescer espiritualmente.',
            'comfortable_environment' => 'Pequenos grupos.',
            'group_project_preference' => 'Trabalhar em equipe.',
            'interest_areas' => ['Estudos Bíblicos', 'Projetos sociais', 'Voluntariado'],
            'learning_style' => 'Um pouco de cada.',
            'personalized_bible_study_interest' => 'Talvez futuramente.',
            'mission_social_projects_interest' => 'Tenho curiosidade.',
            'start_area_preference' => 'Fazer amizades.',
            'talents_for_god' => 'Música',
            'team_support_notes' => 'Disponível aos sábados.',
            'lgpd_consent' => true,
        ];
    }

    public function test_guest_can_create_mission_and_app_account_in_one_submit(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $payload = array_merge($this->missionPayload(), [
            'wants_app_account' => true,
            'app_password' => 'SenhaSegura1!',
            'app_password_confirmation' => 'SenhaSegura1!',
        ]);

        $response = $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $payload);

        $response->assertRedirect(route('mobile.home'));
        $this->assertAuthenticated();
        $this->assertNull(session('mission_submission'));
        $this->assertDatabaseHas('users', ['email' => 'joao.missao@example.com']);
    }

    public function test_guest_declining_app_account_marks_submission_resolved(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $payload = array_merge($this->missionPayload(), [
            'wants_app_account' => false,
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $payload)
            ->assertRedirect(route('mission.form'));

        $submission = session('mission_submission');
        $this->assertIsArray($submission);
        $this->assertTrue($submission['appAccountResolved']);
        $this->assertFalse($submission['appAccountCreated'] ?? false);
        $this->assertNull(session('mission_pending_app_registration'));
    }

    public function test_guest_with_existing_email_skips_app_creation(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        User::factory()->create([
            'church_id' => $church->id,
            'email' => 'existente@example.com',
            'phone' => '11999990000',
        ]);

        $payload = array_merge($this->missionPayload(), [
            'wants_app_account' => true,
            'app_email' => 'existente@example.com',
            'app_password' => 'SenhaSegura1!',
            'app_password_confirmation' => 'SenhaSegura1!',
        ]);

        $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $payload)
            ->assertRedirect(route('mission.form'));

        $submission = session('mission_submission');
        $this->assertTrue($submission['alreadyInApp']);
        $this->assertFalse($submission['appAccountCreated']);
    }
}
