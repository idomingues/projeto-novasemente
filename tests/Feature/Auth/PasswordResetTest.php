<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', ['email' => $user->email]);

        $response->assertStatus(303);
        $response->assertSessionHas('status');

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_link_can_be_requested_with_different_email_casing(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'Usuario.Teste@Example.COM',
        ]);

        $this->post('/forgot-password', ['email' => 'usuario.teste@example.com']);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->get('/reset-password/'.$notification->token.'?email='.urlencode((string) $user->email));

            $response->assertStatus(200);

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            return true;
        });
    }

    public function test_user_can_login_after_password_reset(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'login.apos.reset@example.com',
        ]);

        $newPassword = 'NovaSenha1!';

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($newPassword) {
            $this->post('/reset-password', [
                'token' => $notification->token,
                'email' => 'login.apos.reset@EXAMPLE.com',
                'password' => $newPassword,
                'password_confirmation' => $newPassword,
            ])->assertSessionHasNoErrors();

            return true;
        });

        $user->refresh();
        $this->assertTrue(Hash::check($newPassword, (string) $user->password));

        $login = $this->post('/login', [
            'login' => 'login.apos.reset@example.com',
            'password' => $newPassword,
        ]);

        $login->assertRedirect(route('mobile.home'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_unknown_email_shows_friendly_error(): void
    {
        $response = $this->post('/forgot-password', ['email' => 'nao.existe@example.com']);

        $response->assertSessionHasErrors('email');
        $response->assertSessionMissing('status');
    }
}
