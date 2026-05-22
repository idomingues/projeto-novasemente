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

    private function signupPayload(string $token, string $email = 'novo.voluntario@example.com', ?int $otherMinistryId = null): array
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
            'has_social_networks' => false,
            'attendance_duration' => 'years_1_3',
            'is_official_member' => false,
            'has_previous_ministry_volunteer_experience' => false,
            'is_active_in_ministry' => false,
            'wants_other_ministry' => $otherMinistryId !== null,
            'other_ministry_ids' => $otherMinistryId !== null ? [$otherMinistryId] : [],
            'lgpd_data_consent' => true,
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
        ];
    }

    public function test_public_signup_creates_user_and_redirects_to_login_with_congrats(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class, MinistrySeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $ministry = Ministry::query()->where('church_id', $churchId)->orderBy('name')->firstOrFail();
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $response = $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token, 'novo.voluntario@example.com', $ministry->id));

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('status');
        $response->assertSessionHas('volunteer_signup_welcome', true);
        $this->assertStringContainsString('Bem-vindo', (string) session('status'));
        $this->assertGuest();

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
        $this->assertSame($ministry->name, $volunteer->other_ministry_interest);
        $this->assertTrue($volunteer->ministries()->where('ministries.id', $ministry->id)->exists());

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
