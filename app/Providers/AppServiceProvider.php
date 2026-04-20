<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
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
    }
}
