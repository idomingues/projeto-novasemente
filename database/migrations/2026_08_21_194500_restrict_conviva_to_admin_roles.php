<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Temporário: CONVIVA só para admin/super_admin enquanto o fluxo é validado.
 * Remove conviva.* de secretaria e pastor (se existirem).
 */
return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');
        $names = ['conviva.view', 'conviva.manage'];

        foreach (['secretaria', 'pastor'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->revokePermissionTo($names);
            }
        }
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');
        $names = ['conviva.view', 'conviva.manage'];

        foreach (['secretaria', 'pastor'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo($names);
            }
        }
    }
};
