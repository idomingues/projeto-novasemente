<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_inertia_register_validation_redirect_then_get_has_errors_in_json(): void
    {
        $manifest = public_path('build/manifest.json');
        $version = is_file($manifest) ? hash_file('xxh128', $manifest) : '';

        $this->get(route('register', absolute: false));

        $post = $this->from(route('register', absolute: false))->post(route('register', absolute: false), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'different',
            'notify_via_app' => true,
            'notify_via_email' => true,
            'notify_via_whatsapp' => false,
            'lgpd_accepted' => true,
        ], [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $version,
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ]);

        $post->assertStatus(303);
        $post->assertSessionHasErrors('password');

        $location = $post->headers->get('Location');
        $this->assertNotFalse($location);

        $get = $this->get($location, [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $version,
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ]);

        $get->assertOk();
        $get->assertHeader('x-inertia');
        $page = $get->json();
        $this->assertIsArray($page);
        $errors = $page['props']['errors'] ?? null;
        $this->assertIsArray($errors);
        $this->assertArrayHasKey('password', $errors);
        $this->assertNotEmpty($errors['password']);
        $this->assertGuest();
    }

    public function test_password_confirmation_must_match_on_register(): void
    {
        $response = $this->from(route('register', absolute: false))
            ->post(route('register', absolute: false), [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => 'password',
                'password_confirmation' => 'different',
                'notify_via_app' => true,
                'notify_via_email' => true,
                'notify_via_whatsapp' => false,
                'lgpd_accepted' => true,
            ]);

        $response->assertRedirect(route('register', absolute: false));
        $response->assertSessionHasErrors('password');
        $this->assertGuest();
    }

    public function test_register_requires_name_email_password(): void
    {
        $response = $this->from(route('register', absolute: false))
            ->post(route('register', absolute: false), []);

        $response->assertRedirect(route('register', absolute: false));
        $response->assertSessionHasErrors(['name', 'email', 'password', 'notify_via_app', 'notify_via_email', 'notify_via_whatsapp', 'lgpd_accepted']);
        $this->assertGuest();
    }
}
