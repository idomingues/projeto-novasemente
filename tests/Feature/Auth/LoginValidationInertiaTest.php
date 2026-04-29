<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginValidationInertiaTest extends TestCase
{
    use RefreshDatabase;

    public function test_inertia_login_failed_validation_redirect_then_get_has_errors_in_json(): void
    {
        $manifest = public_path('build/manifest.json');
        $version = is_file($manifest) ? hash_file('xxh128', $manifest) : '';

        $user = User::factory()->create();

        $this->get(route('login', absolute: false));

        $post = $this->from(route('login', absolute: false))->post(route('login', absolute: false), [
            'login' => $user->email,
            'password' => 'wrong-password',
            'remember' => false,
            'redirect' => '',
            'website' => '',
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

    public function test_inertia_login_unknown_user_redirect_then_get_has_login_error_in_json(): void
    {
        $manifest = public_path('build/manifest.json');
        $version = is_file($manifest) ? hash_file('xxh128', $manifest) : '';

        $this->get(route('login', absolute: false));

        $post = $this->from(route('login', absolute: false))->post(route('login', absolute: false), [
            'login' => 'definitely-not-a-user@example.com',
            'password' => 'any-password',
            'remember' => false,
            'redirect' => '',
            'website' => '',
        ], [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $version,
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ]);

        $post->assertStatus(303);
        $post->assertSessionHasErrors('login');

        $location = $post->headers->get('Location');
        $this->assertNotFalse($location);

        $get = $this->get($location, [
            'HTTP_X_INERTIA' => 'true',
            'HTTP_X_INERTIA_VERSION' => $version,
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ]);

        $get->assertOk();
        $page = $get->json();
        $this->assertIsArray($page);
        $errors = $page['props']['errors'] ?? null;
        $this->assertIsArray($errors);
        $this->assertArrayHasKey('login', $errors);
        $this->assertNotEmpty($errors['login']);
        $this->assertGuest();
    }
}
