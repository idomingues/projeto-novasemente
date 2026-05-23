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

        Permission::firstOrCreate(['name' => 'library.manage', 'guard_name' => $guard]);

        foreach (['admin', 'secretaria', 'pastor', 'lider_ministerio'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role !== null && ! $role->hasPermissionTo('library.manage')) {
                $role->givePermissionTo('library.manage');
            }
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin !== null && ! $superAdmin->hasPermissionTo('library.manage')) {
            $superAdmin->givePermissionTo('library.manage');
        }
    }

    public function down(): void
    {
        // não remove — pode estar em uso
    }
};
