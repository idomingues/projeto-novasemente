<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Foundation\Console\ServeCommand;
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

        Vite::prefetch(concurrency: 3);

        Password::defaults(fn () => Password::min(6));

        // Spatie PermissionMiddleware uses $user->canAny() (Gate). This avoids 403 in production
        // when permissions/roles are out of sync with seeders or cache is stale.
        Gate::before(function ($user, string $ability) {
            if ($user instanceof User && $user->hasRole(['super_admin', 'admin'])) {
                return true;
            }

            return null;
        });

        $this->ensureSqliteDatabaseFileExists();
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
