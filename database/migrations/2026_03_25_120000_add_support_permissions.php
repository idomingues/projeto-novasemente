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

        foreach (['support.view', 'support.manage'] as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => $guard]
            );
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(['support.view', 'support.manage']);
        }

        Role::query()
            ->whereHas('permissions', fn ($q) => $q->where('name', 'notifications.manage'))
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo(['support.view', 'support.manage']));
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');

        foreach (['support.view', 'support.manage'] as $name) {
            Permission::query()->where('name', $name)->where('guard_name', $guard)->delete();
        }
    }
};
