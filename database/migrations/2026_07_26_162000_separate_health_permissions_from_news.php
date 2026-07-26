<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Saúde deixa de compartilhar news.*: cria health.view / health.manage
 * e copia o acesso de quem já tinha news.view / news.manage.
 */
return new class extends Migration
{
    public function up(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        $healthView = Permission::findOrCreate('health.view', $guard);
        $healthManage = Permission::findOrCreate('health.manage', $guard);
        $newsView = Permission::findByName('news.view', $guard);
        $newsManage = Permission::findByName('news.manage', $guard);

        foreach (Role::query()->where('guard_name', $guard)->cursor() as $role) {
            if ($newsView && $role->hasPermissionTo($newsView)) {
                $role->givePermissionTo($healthView);
            }
            if ($newsManage && $role->hasPermissionTo($newsManage)) {
                $role->givePermissionTo($healthManage);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        foreach (['health.view', 'health.manage'] as $name) {
            Permission::findByName($name, $guard)?->delete();
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
