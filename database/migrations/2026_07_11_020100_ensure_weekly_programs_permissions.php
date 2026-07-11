<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');
        $names = ['programacao.view', 'programacao.manage'];

        foreach ($names as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => $guard]
            );
        }

        foreach (['super_admin', 'admin', 'secretaria'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo($names);
            }
        }
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');

        foreach (['programacao.view', 'programacao.manage'] as $name) {
            Permission::query()->where('name', $name)->where('guard_name', $guard)->delete();
        }
    }
};
