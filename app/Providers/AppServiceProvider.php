<?php

namespace App\Providers;

use App\Models\User;
use App\Models\UserInboxNotification;
use App\Observers\UserInboxNotificationObserver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // `artisan serve` spawns `php -S` with most env vars cleared; keep dev upload ini (npm run serve).
        if (! in_array('PHP_INI_SCAN_DIR', ServeCommand::$passthroughVariables, true)) {
            ServeCommand::$passthroughVariables[] = 'PHP_INI_SCAN_DIR';
        }

        Carbon::setLocale(config('app.locale'));

        // Interface do produto é pt_BR; evita chaves cruas (ex.: auth.user) quando APP_LOCALE=en no .env.
        app()->setLocale(config('app.locale', 'pt_BR') === 'en' ? 'pt_BR' : (string) config('app.locale', 'pt_BR'));

        Vite::prefetch(concurrency: 3);

        Password::defaults(fn () => Password::min(6));

        $this->configurePasswordResetNotifications();

        // Spatie PermissionMiddleware uses $user->canAny() (Gate). This avoids 403 in production
        // when permissions/roles are out of sync with seeders or cache is stale.
        Gate::before(function ($user, string $ability) {
            if ($user instanceof User && $user->hasRole(['super_admin', 'admin'])) {
                return true;
            }

            return null;
        });

        $this->ensureSqliteDatabaseFileExists();

        UserInboxNotification::observe(UserInboxNotificationObserver::class);

        RedirectIfAuthenticated::redirectUsing(function (Request $request): string {
            $user = $request->user();
            if ($user instanceof User && $user->canAccessAdminMenu()) {
                return route('dashboard');
            }

            return route('mobile.home');
        });
    }

    private function configurePasswordResetNotifications(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            return route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], absolute: true);
        });

        ResetPassword::toMailUsing(function (object $notifiable, string $token): MailMessage {
            $url = route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], absolute: true);

            $expire = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

            return (new MailMessage)
                ->subject('Redefinir senha — Nova Semente')
                ->greeting('Olá!')
                ->line('Recebemos um pedido para redefinir a senha da sua conta.')
                ->action('Redefinir senha', $url)
                ->line("Este link expira em {$expire} minutos.")
                ->line('Se você não solicitou a redefinição, ignore este e-mail.');
        });
    }

    /**
     * Com DB_CONNECTION=sqlite, um ficheiro em falta faz todas as queries falharem (ecrãs vazios ou erros).
     */
    private function ensureSqliteDatabaseFileExists(): void
    {
        if (config('database.default') !== 'sqlite') {
            return;
        }

        $path = config('database.connections.sqlite.database');
        if (! is_string($path) || $path === '' || $path === ':memory:') {
            return;
        }

        if (file_exists($path)) {
            return;
        }

        $dir = dirname($path);
        if (! is_dir($dir)) {
            File::ensureDirectoryExists($dir);
        }

        if (@touch($path)) {
            Log::info('Ficheiro SQLite criado automaticamente; execute php artisan migrate se ainda não o fez.', ['path' => $path]);

            return;
        }

        Log::warning('Ficheiro SQLite em falta e não foi possível criá-lo.', ['path' => $path]);
    }
}
