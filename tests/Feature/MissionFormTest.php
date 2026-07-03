<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MissionFormTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function validPayload(): array
    {
        return [
            'photo' => UploadedFile::fake()->image('face.jpg', 400, 400),
            'full_name' => 'Maria Silva',
            'birth_date' => '1990-03-15',
            'phone' => '11999998888',
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
            'talents_for_god' => 'Tenho experiência com música e organização de eventos.',
            'team_support_notes' => 'Gostaria de conhecer grupos para novos participantes.',
            'lgpd_consent' => true,
        ];
    }

    public function test_public_mission_form_renders_full_questionnaire_options(): void
    {
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $this->withSession(['working_church_id' => $church->id])
            ->get(route('mission.form'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mission/Form')
                ->where('churchName', $church->name)
                ->where('formRevision', 13)
                ->where('layout', 'default')
                ->has('options.professions')
                ->has('options.spiritual_journey', 5)
                ->has('options.comfortable_environment', 4)
                ->has('options.group_project_preference', 5)
                ->has('options.interest_areas', 9)
                ->has('options.learning_style', 5)
                ->has('options.personalized_bible_study_interest', 3)
                ->has('options.mission_social_projects_interest', 4)
                ->has('options.start_area_preference', 6)
                ->where('options.spiritual_journey.0', 'Estou conhecendo a fé cristã.')
                ->where('options.interest_areas.0', 'Estudos Bíblicos')
                ->where('options.interest_areas.8', 'Voluntariado'));
    }

    public function test_public_mission_form_accepts_extended_question_payload(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $response = $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $this->validPayload());

        $response->assertRedirect(route('mission.form'));
        $response->assertSessionHas('mission_submission');
        $response->assertSessionHas('mission_pending_app_registration');

        $submission = session('mission_submission');
        $this->assertIsArray($submission);
        $this->assertFalse($submission['alreadyInApp']);

        $volunteer = MissionVolunteer::query()->where('full_name', 'Maria Silva')->first();
        $this->assertNotNull($volunteer);
        $this->assertSame('Enfermeiro(a)', $volunteer->profession);
        $this->assertEquals(['Música/Louvor'], $volunteer->seeks_in_community);
        $this->assertSame('Tenho interesse em crescer espiritualmente.', $volunteer->spiritual_journey);
        $this->assertEquals(['Estudos Bíblicos', 'Projetos sociais', 'Voluntariado'], $volunteer->interest_areas);
        $this->assertSame('Gostaria de conhecer grupos para novos participantes.', $volunteer->team_support_notes);
        $this->assertNull($volunteer->nps_score);
        $this->assertNull($volunteer->profile_type);
        $this->assertNotNull($volunteer->photo_path);
        Storage::disk('public')->assertExists($volunteer->photo_path);
    }

    public function test_mission_submission_detects_existing_app_user_by_phone(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        User::factory()->create([
            'church_id' => $church->id,
            'phone' => '(11) 99999-8888',
        ]);

        $response = $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $this->validPayload());

        $response->assertSessionHas('mission_submission');
        $this->assertTrue(session('mission_submission')['alreadyInApp']);
        $this->assertNull(session('mission_pending_app_registration'));
    }

    public function test_mission_volunteer_can_create_app_account_after_submission(): void
    {
        Mail::fake();
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();
        $guard = (string) config('auth.defaults.guard');
        Role::findOrCreate('membro', $guard);

        $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $this->validPayload())
            ->assertSessionHas('mission_pending_app_registration');

        $volunteerId = session('mission_pending_app_registration')['volunteer_id'];

        $response = $this->withSession([
            'working_church_id' => $church->id,
            'mission_pending_app_registration' => [
                'volunteer_id' => $volunteerId,
                'church_id' => $church->id,
            ],
        ])->post(route('mission.app-account.store'), [
            'email' => 'maria.missao@example.com',
            'password' => 'SenhaSegura1!',
            'password_confirmation' => 'SenhaSegura1!',
        ]);

        $response->assertRedirect(route('mission.form'));
        $response->assertSessionHas('mission_submission');
        $submission = session('mission_submission');
        $this->assertTrue($submission['appAccountCreated']);
        $this->assertTrue($submission['instructionsEmailSent']);
        $this->assertNotEmpty($submission['instructions']);
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'maria.missao@example.com']);

        $volunteer = MissionVolunteer::query()->findOrFail($volunteerId);
        $this->assertSame('maria.missao@example.com', $volunteer->email);

        Mail::assertSent(\App\Mail\MissionVolunteerInstructionsMail::class);
    }

    public function test_studied_bible_legacy_option_still_valid(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $payload = $this->validPayload();
        $payload['studied_bible'] = 'Sim, complemente';

        $this->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $payload)
            ->assertRedirect(route('mission.form'));
    }

    public function test_mission_form_rejects_more_than_three_interest_areas(): void
    {
        Storage::fake('public');
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $payload = $this->validPayload();
        $payload['interest_areas'] = [
            'Estudos Bíblicos',
            'Pequenos Grupos',
            'Projetos sociais',
            'Voluntariado',
        ];

        $response = $this->from(route('mission.form'))
            ->withSession(['working_church_id' => $church->id])
            ->post(route('mission.store'), $payload);

        $response
            ->assertRedirect(route('mission.form'))
            ->assertSessionHasErrors(['interest_areas']);

        $this->assertDatabaseCount('mission_volunteers', 0);
    }
}
