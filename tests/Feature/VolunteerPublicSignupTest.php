<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerPipelineStage;
use App\Models\VolunteerSelfSignupToken;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\MinistrySeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VolunteerPublicSignupTest extends TestCase
{
    use RefreshDatabase;

    private function signupPayload(string $token, string $email = 'novo.voluntario@example.com'): array
    {
        return [
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
        ];
    }

    public function test_public_signup_creates_user_and_redirects_to_login_with_congrats(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $response = $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'novo.voluntario@example.com'));

        $response->assertRedirect(route('login', absolute: false));
        $response->assertSessionHas('status');
        $response->assertSessionHas('volunteer_signup_welcome', true);
        $this->assertStringContainsString('Bem-vindo', (string) session('status'));
        $this->assertGuest();

        $this->get(route('login', absolute: false))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/Login')
                ->where('volunteerSignupWelcome', true));

        $this->assertDatabaseHas('users', [
            'email' => 'novo.voluntario@example.com',
            'name' => 'Maria Silva',
            'church_id' => $churchId,
            'is_volunteer' => true,
        ]);

        $user = User::query()->where('email', 'novo.voluntario@example.com')->firstOrFail();
        $this->assertNotNull($user->photo_url);
        $volunteer = Volunteer::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($volunteer);
        $this->assertSame('interested', $volunteer->volunteer_phase);
        $this->assertSame('Administração', $volunteer->professional_area);

        $interessadoStageId = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
            ->value('id');
        $this->assertNotNull($interessadoStageId);
        $pipeline = VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->first();
        $this->assertNotNull($pipeline);
        $this->assertSame((int) $interessadoStageId, (int) $pipeline->stage_id);
    }

    public function test_public_signup_inertia_request_redirects_to_login_via_location_header(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $response = $this->withHeaders([
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'inertia.voluntario@example.com'));

        $response->assertStatus(409);
        $response->assertHeader('X-Inertia-Location', route('login'));
        $response->assertSessionHas('volunteer_signup_welcome', true);
    }

    public function test_volunteer_can_login_after_public_signup(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $email = 'acesso.voluntario@example.com';
        $password = 'Password1!xx';

        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, $email));

        $login = $this->post('/login', [
            'login' => $email,
            'password' => $password,
        ]);

        $login->assertRedirect(route('mobile.home'));
        $this->assertAuthenticated();
    }

    public function test_public_signup_recadastro_with_app_account_goes_to_existing_options(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $email = 'recadastro.voluntario@example.com';
        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, $email));

        $userCountBefore = User::query()->where('email', $email)->count();
        $volunteerCountBefore = Volunteer::query()->where('email', $email)->count();

        $payload = $this->signupPayload($token, $email);
        $payload['password'] = 'Password2!yy';
        $payload['password_confirmation'] = 'Password2!yy';
        $response = $this->post(route('volunteers.self-signup.store'), $payload);

        $response->assertRedirect(route('volunteers.self-signup.existing', ['token' => $token], absolute: false));
        $response->assertSessionHas('info');
        $this->assertSame($userCountBefore, User::query()->where('email', $email)->count());
        $this->assertSame($volunteerCountBefore, Volunteer::query()->where('email', $email)->count());
    }

    public function test_public_signup_links_pre_registered_volunteer_without_user(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $preRegistered = Volunteer::query()->create([
            'name' => 'João Pré-cadastro',
            'email' => 'precadastro@example.com',
            'user_id' => null,
            'active' => true,
        ]);

        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'precadastro@example.com'));

        $preRegistered->refresh();
        $this->assertNotNull($preRegistered->user_id);
        $this->assertDatabaseHas('users', [
            'id' => $preRegistered->user_id,
            'email' => 'precadastro@example.com',
        ]);
        $this->assertSame(1, Volunteer::query()->where('email', 'precadastro@example.com')->count());
    }

    public function test_public_signup_rejects_birth_date_under_ten_years(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $payload = $this->signupPayload($token, 'menor.voluntario@example.com');
        $payload['birth_date'] = now()->subYears(5)->format('Y-m-d');

        $response = $this->post(route('volunteers.self-signup.store'), $payload);

        $response->assertSessionHasErrors(['birth_date']);
        $this->assertDatabaseMissing('users', ['email' => 'menor.voluntario@example.com']);
    }

    public function test_public_signup_rejects_existing_admin_email(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $admin = User::factory()->create(['email' => 'admin.equipe@example.com']);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));

        $response = $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'admin.equipe@example.com'));

        $response->assertSessionHasErrors(['email']);
        $this->assertSame(1, User::query()->where('email', 'admin.equipe@example.com')->count());
        $admin->refresh();
        $this->assertTrue($admin->hasRole('admin'));
    }

    public function test_logged_in_volunteer_opens_existing_options_from_public_signup(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'email' => 'voluntario.existente@example.com',
        ]);
        $this->assertNotNull($user->fresh()->volunteerProfile);

        $this->actingAs($user)
            ->get(route('volunteers.public-signup.page'))
            ->assertRedirect();

        $token = VolunteerSelfSignupToken::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()],
        )->token;

        $this->actingAs($user)
            ->get(route('volunteers.self-signup.existing', ['token' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Volunteers/SignupExistingOptions')
                ->where('status', 'existing')
                ->where('hasAppAccount', true)
                ->where('isAuthenticated', true));

        $this->actingAs($user)
            ->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'voluntario.existente@example.com'))
            ->assertRedirect(route('volunteers.self-signup.existing', ['token' => $token], absolute: false))
            ->assertSessionHas('info');
    }

    public function test_login_shows_hint_when_volunteer_exists_without_user_account(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        Volunteer::query()->create([
            'name' => 'Só Ficha',
            'email' => 'ivan@iresult22.com.br',
            'active' => true,
            'user_id' => null,
        ]);

        $response = $this->post('/login', [
            'login' => 'ivan@iresult22.com.br',
            'password' => 'Password1!xx',
        ]);

        $response->assertSessionHasErrors('login');
        $errors = session('errors');
        $this->assertNotNull($errors);
        $message = (string) $errors->get('login')[0];
        $this->assertStringContainsString('sem conta de acesso', $message);
    }

    public function test_public_signup_assigns_only_membro_role(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'somente.membro@example.com'));

        $user = User::query()->where('email', 'somente.membro@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('membro'));
        $this->assertFalse($user->canAccessAdminMenu());
        $this->assertFalse($user->hasRole('admin'));
        $this->assertCount(1, $user->roles);
    }

    public function test_identify_new_email_goes_to_form_and_existing_goes_to_options(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $this->post(route('volunteers.self-signup.identify'), [
            'token' => $token,
            'email' => 'novo.gate@example.com',
        ])->assertRedirect(route('volunteers.self-signup.existing', ['token' => $token], absolute: false));

        $this->get(route('volunteers.self-signup.existing', ['token' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Volunteers/SignupExistingOptions')
                ->where('status', 'new')
                ->where('email', 'novo.gate@example.com'));

        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'ja.voluntario.gate@example.com'));

        $this->post(route('volunteers.self-signup.identify'), [
            'token' => $token,
            'email' => 'ja.voluntario.gate@example.com',
        ])->assertRedirect(route('volunteers.self-signup.existing', ['token' => $token], absolute: false));

        $this->get(route('volunteers.self-signup.existing', ['token' => $token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Volunteers/SignupExistingOptions')
                ->where('status', 'existing')
                ->where('hasAppAccount', true));
    }

    public function test_request_new_department_creates_note_and_sets_interessado(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $church = Church::query()->orderBy('id')->firstOrFail();
        $churchId = (int) $church->id;
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $ministries = Ministry::query()->where('church_id', $churchId)->orderBy('id')->take(2)->get();
        $this->assertGreaterThanOrEqual(2, $ministries->count());
        $currentMinistry = $ministries[0];
        $requestedMinistry = $ministries[1];

        $user = User::factory()->create([
            'church_id' => $churchId,
            'is_volunteer' => true,
            'email' => 'pedido.dept@example.com',
        ]);
        $volunteer = $user->fresh()->volunteerProfile;
        $this->assertNotNull($volunteer);
        $volunteer->ministries()->sync([$currentMinistry->id]);

        $atuante = VolunteerPipelineStage::query()->firstOrCreate(
            ['church_id' => $churchId, 'name' => 'Atuante'],
            ['sort_order' => 40],
        );
        VolunteerChurchPipeline::query()->updateOrCreate(
            ['volunteer_id' => $volunteer->id, 'church_id' => $churchId],
            ['stage_id' => $atuante->id, 'admin_workflow_stage_id' => $atuante->id],
        );

        $this->actingAs($user)->post(route('volunteers.self-signup.request-department.store'), [
            'token' => $token,
            'ministry_ids' => [$requestedMinistry->id],
            'reason' => 'Quero servir na recepção aos sábados.',
        ])->assertRedirect(route('mobile.home', absolute: false));

        $this->assertDatabaseHas('volunteer_leader_notes', [
            'volunteer_id' => $volunteer->id,
            'church_id' => $churchId,
        ]);
        $note = \App\Models\VolunteerLeaderNote::query()
            ->where('volunteer_id', $volunteer->id)
            ->latest('id')
            ->first();
        $this->assertNotNull($note);
        $this->assertStringContainsString('Pedido de novo departamento', $note->body);
        $this->assertStringContainsString('Quero servir na recepção', $note->body);

        $interessadoId = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(name) = ?', ['interessado'])
            ->value('id');
        $this->assertNotNull($interessadoId);

        $pipeline = VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->first();
        $this->assertNotNull($pipeline);
        $this->assertTrue(
            (int) $pipeline->admin_workflow_stage_id === (int) $interessadoId
            || (int) $pipeline->stage_id === (int) $interessadoId
        );
    }
}
