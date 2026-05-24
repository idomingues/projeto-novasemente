<?php

namespace Tests\Feature\Auth;

use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_forgot_password_hides_mail_log_hint_in_production_even_with_log_mailer(): void
    {
        config(['mail.default' => 'log', 'app.env' => 'production']);
        $this->app['env'] = 'production';

        $this->get('/forgot-password')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/ForgotPassword')
                ->where('showMailLogHint', false));
    }

    public function test_forgot_password_shows_mail_log_hint_outside_production_with_log_mailer(): void
    {
        config(['mail.default' => 'log']);

        $this->app->detectEnvironment(fn () => 'local');

        $this->get('/forgot-password')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Auth/ForgotPassword')
                ->where('showMailLogHint', true));
    }

    public function test_reset_password_link_is_blocked_in_production_when_mail_mailer_is_log(): void
    {
        Notification::fake();

        config(['mail.default' => 'log', 'app.env' => 'production']);
        $this->app['env'] = 'production';

        $user = User::factory()->create();
        $request = Request::create('/forgot-password', 'POST', ['email' => $user->email]);

        try {
            app(PasswordResetLinkController::class)->store($request);
            $this->fail('Expected validation exception when mail is log in production.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('email', $exception->errors());
        }

        Notification::assertNothingSent();
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

    public function test_reset_password_link_can_be_requested_when_email_is_only_on_volunteer_record(): void
    {
        Notification::fake();

        $user = User::withoutEvents(fn () => User::create([
            'name' => 'Marly Domingues',
            'email' => null,
            'password' => Hash::make('123456'),
        ]));

        Volunteer::query()->create([
            'name' => 'Marly Domingues',
            'email' => 'marly@gmail.com.br',
            'user_id' => $user->id,
            'active' => true,
        ]);

        $response = $this->post('/forgot-password', ['email' => 'marly@gmail.com.br']);

        $response->assertStatus(303);
        $response->assertSessionHas('status');

        Notification::assertSentTo($user->fresh(), ResetPassword::class);
        $this->assertSame('marly@gmail.com.br', $user->fresh()->email);
    }

    public function test_unknown_email_shows_friendly_error(): void
    {
        $response = $this->post('/forgot-password', ['email' => 'nao.existe@example.com']);

        $response->assertSessionHasErrors('email');
        $response->assertSessionMissing('status');
    }
}
