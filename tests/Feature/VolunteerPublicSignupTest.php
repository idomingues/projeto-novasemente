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

    public function test_public_signup_recadastro_redirects_to_login_not_signup_form(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $email = 'recadastro.voluntario@example.com';
        $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, $email));

        $user = User::query()->where('email', $email)->firstOrFail();
        $volunteer = Volunteer::query()->where('user_id', $user->id)->firstOrFail();
        $volunteer->forceFill(['user_id' => null])->save();

        $payload = $this->signupPayload($token, $email);
        $payload['password'] = 'Password2!yy';
        $payload['password_confirmation'] = 'Password2!yy';
        $response = $this->post(route('volunteers.self-signup.store'), $payload);

        $response->assertRedirect(route('login', absolute: false));
        $response->assertSessionHas('volunteer_signup_welcome', true);
        $volunteer->refresh();
        $this->assertSame($user->id, $volunteer->user_id);
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

    public function test_logged_in_volunteer_redirects_public_signup_to_edit(): void
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
            ->assertRedirect(route('volunteers.self-signup.edit', absolute: false))
            ->assertSessionHas(
                'info',
                'Você já possui cadastro de voluntário. Revise e atualize suas informações abaixo quando precisar.'
            );

        $token = VolunteerSelfSignupToken::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()],
        )->token;

        $this->actingAs($user)
            ->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'voluntario.existente@example.com'))
            ->assertRedirect(route('volunteers.self-signup.edit', absolute: false))
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
}
