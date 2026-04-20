<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'lgpd_accepted' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('registration.welcome', absolute: false));
        $response->assertSessionHas('registration_success', true);

        $this->get(route('registration.welcome', absolute: false))
            ->assertOk();
    }

    public function test_registration_welcome_redirects_guests_to_login(): void
    {
        $this->get(route('registration.welcome', absolute: false))
            ->assertRedirect(route('login', absolute: false));
    }

    public function test_registration_welcome_without_flash_redirects_to_news(): void
    {
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)
            ->get(route('registration.welcome', absolute: false))
            ->assertRedirect(route('mobile.news', absolute: false));
    }
}
