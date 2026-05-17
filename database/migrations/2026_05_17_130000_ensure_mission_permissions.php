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

        foreach (['mission.view', 'mission.manage'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(['mission.view', 'mission.manage']);
        }

        foreach (['admin', 'secretaria'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo(['mission.view', 'mission.manage']);
            }
        }

        $pastor = Role::query()->where('name', 'pastor')->where('guard_name', $guard)->first();
        if ($pastor) {
            $pastor->givePermissionTo(['mission.view']);
        }

        $lider = Role::query()->where('name', 'lider_ministerio')->where('guard_name', $guard)->first();
        if ($lider) {
            $lider->givePermissionTo(['mission.view', 'mission.manage']);
        }
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');

        foreach (['mission.view', 'mission.manage'] as $name) {
            Permission::query()->where('name', $name)->where('guard_name', $guard)->delete();
        }
    }
};
