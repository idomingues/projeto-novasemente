<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Support\MissionVolunteerPayload;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MissionVolunteerUpdateTest extends TestCase
{
    use RefreshDatabase;

    private Church $church;

    private User $admin;

    private MissionVolunteer $volunteer;

    /** @return array<string, mixed> */
    private function validPayload(): array
    {
        return [
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
            'talents_for_god' => 'Tenho experiência com música.',
            'team_support_notes' => 'Gostaria de conhecer grupos.',
        ];
    }

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->seed(RolePermissionSeeder::class);
        $this->seed(ChurchSeeder::class);

        $this->church = Church::query()->firstOrFail();
        $this->admin = User::factory()->create(['church_id' => $this->church->id]);
        $this->admin->assignRole('admin');

        $phase = MissionPhase::query()->create([
            'church_id' => $this->church->id,
            'name' => 'Onboarding',
            'sort_order' => 10,
            'sla_days' => 7,
        ]);

        $attrs = MissionVolunteerPayload::registrationAttributes($this->validPayload(), 'mission/volunteers/existing.jpg');

        $this->volunteer = MissionVolunteer::query()->create(array_merge($attrs, [
            'church_id' => $this->church->id,
            'mission_phase_id' => $phase->id,
            'phase_entered_at' => now(),
            'registration_completed_at' => now(),
            'lgpd_consent' => true,
        ]));
    }

    public function test_detail_includes_update_url_for_operable_volunteer(): void
    {
        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->getJson(route('mission.volunteers.detail', $this->volunteer))
            ->assertOk()
            ->assertJsonPath('canEditRegistration', true)
            ->assertJsonPath('updateUrl', route('mission.volunteers.update', $this->volunteer));
    }

    public function test_admin_can_update_mission_volunteer_birth_date(): void
    {
        $payload = $this->validPayload();
        $payload['birth_date'] = '1987-08-02';

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->patchJson(route('mission.volunteers.update', $this->volunteer), $payload)
            ->assertOk()
            ->assertJsonPath('volunteer.birthDate', '1987-08-02');

        $this->assertSame('1987-08-02', $this->volunteer->fresh()->birth_date?->format('Y-m-d'));
    }

    public function test_admin_can_update_mission_volunteer_registration_with_multipart_form(): void
    {
        $payload = $this->validPayload();
        $payload['birth_date'] = '1987-08-02';
        $payload['full_name'] = 'Pamela Pereira Alves';

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->call(
                'POST',
                route('mission.volunteers.update', $this->volunteer),
                $payload,
                [],
                [],
                $this->transformHeadersToServerVars([
                    'Accept' => 'application/json',
                    'X-HTTP-Method-Override' => 'PATCH',
                ]),
            )
            ->assertOk()
            ->assertJsonPath('volunteer.birthDate', '1987-08-02')
            ->assertJsonPath('volunteer.fullName', 'Pamela Pereira Alves');

        $fresh = $this->volunteer->fresh();
        $this->assertSame('1987-08-02', $fresh->birth_date?->format('Y-m-d'));
        $this->assertSame('Pamela Pereira Alves', $fresh->full_name);
    }

    public function test_admin_can_update_mission_volunteer_registration(): void
    {
        $payload = [
            'full_name' => 'Ana Caroline Alves da Silva',
            'birth_date' => '1990-03-15',
            'phone' => '11968980088',
            'full_address' => 'Rua Oliveira Golveia, 26',
            'profession' => 'Contador(a)',
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
            'talents_for_god' => 'Organização.',
            'team_support_notes' => 'Prefere contato à tarde.',
        ];

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->patchJson(route('mission.volunteers.update', $this->volunteer), $payload)
            ->assertOk()
            ->assertJsonPath('volunteer.fullName', 'Ana Caroline Alves da Silva')
            ->assertJsonPath('message', 'Cadastro atualizado.');

        $this->volunteer->refresh();
        $this->volunteer->load('phase');
        $this->assertSame('Ana Caroline Alves da Silva', $this->volunteer->full_name);
        $this->assertSame('11968980088', $this->volunteer->phone);
        $this->assertSame('Prefere contato à tarde.', $this->volunteer->team_support_notes);
        $this->assertSame('Onboarding', $this->volunteer->phase?->name);
    }

    public function test_admin_can_replace_volunteer_photo(): void
    {
        $payload = [
            'full_name' => $this->volunteer->full_name,
            'birth_date' => $this->volunteer->birth_date?->format('Y-m-d'),
            'phone' => $this->volunteer->phone,
            'full_address' => $this->volunteer->full_address,
            'profession' => $this->volunteer->profession,
            'has_belief' => $this->volunteer->has_belief,
            'belief_which' => $this->volunteer->belief_which,
            'participates_religion' => $this->volunteer->participates_religion,
            'religion_which' => $this->volunteer->religion_which,
            'baptized' => $this->volunteer->baptized,
            'seeks_in_community' => $this->volunteer->seeks_in_community,
            'studied_bible' => $this->volunteer->studied_bible,
            'studied_bible_structured' => $this->volunteer->studied_bible_structured,
            'first_time_nova_semente' => $this->volunteer->first_time_nova_semente,
            'first_contact_via' => $this->volunteer->first_contact_via,
            'wants_bible_study_partner' => $this->volunteer->wants_bible_study_partner,
            'spiritual_journey' => $this->volunteer->spiritual_journey,
            'comfortable_environment' => $this->volunteer->comfortable_environment,
            'group_project_preference' => $this->volunteer->group_project_preference,
            'interest_areas' => $this->volunteer->interest_areas,
            'learning_style' => $this->volunteer->learning_style,
            'personalized_bible_study_interest' => $this->volunteer->personalized_bible_study_interest,
            'mission_social_projects_interest' => $this->volunteer->mission_social_projects_interest,
            'start_area_preference' => $this->volunteer->start_area_preference,
            'photo' => UploadedFile::fake()->image('nova-foto.jpg', 400, 400),
        ];

        $oldPath = $this->volunteer->photo_path;

        $this->withSession(['working_church_id' => $this->church->id])
            ->actingAs($this->admin)
            ->patchJson(route('mission.volunteers.update', $this->volunteer), $payload)
            ->assertOk();

        $this->volunteer->refresh();
        $this->assertNotSame($oldPath, $this->volunteer->photo_path);
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($this->volunteer->photo_path);
    }
}
