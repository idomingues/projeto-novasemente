<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use Database\Seeders\ChurchSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class VolunteerPublicSignupTest extends TestCase
{
    use RefreshDatabase;

    private function signupPayload(string $token, string $email = 'novo.voluntario@example.com'): array
    {
        return [
            'token' => $token,
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
            'other_ministry_interest' => 'Louvor',
            'needs_pastoral_guidance' => false,
            'lgpd_data_consent' => true,
            'password' => 'Password1!xx',
            'password_confirmation' => 'Password1!xx',
        ];
    }

    public function test_public_signup_creates_user_and_redirects_to_login_with_congrats(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

        $churchId = (int) Church::query()->orderBy('id')->value('id');
        $token = VolunteerSelfSignupToken::query()->create([
            'church_id' => $churchId,
            'token' => (string) Str::uuid(),
        ])->token;

        $response = $this->post(route('volunteers.self-signup.store'), $this->signupPayload($token));

        $response->assertRedirect(route('login'));
        $response->assertSessionHas('status');
        $this->assertGuest();

        $this->assertDatabaseHas('users', [
            'email' => 'novo.voluntario@example.com',
            'name' => 'Maria Silva',
            'church_id' => $churchId,
            'is_volunteer' => true,
        ]);

        $user = User::query()->where('email', 'novo.voluntario@example.com')->firstOrFail();
        $volunteer = Volunteer::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($volunteer);
        $this->assertSame('Louvor', $volunteer->other_ministry_interest);
    }

    public function test_volunteer_can_login_after_public_signup(): void
    {
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

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
        $this->seed([RolePermissionSeeder::class, ChurchSeeder::class]);

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
}
