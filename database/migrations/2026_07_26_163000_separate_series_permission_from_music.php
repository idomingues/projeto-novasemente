<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Séries deixa de compartilhar music.manage: cria series.manage
 * e copia o acesso de quem já tinha music.manage.
 */
return new class extends Migration
{
    public function up(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        $seriesManage = Permission::findOrCreate('series.manage', $guard);
        $musicManage = Permission::findByName('music.manage', $guard);

        if ($musicManage) {
            foreach (Role::query()->where('guard_name', $guard)->cursor() as $role) {
                if ($role->hasPermissionTo($musicManage)) {
                    $role->givePermissionTo($seriesManage);
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        Permission::findByName('series.manage', $guard)?->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
