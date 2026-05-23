<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = config('auth.defaults.guard');
        $names = ['shared_talents.moderate', 'shared_talents.manage'];

        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        foreach (['admin', 'secretaria'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo(['shared_talents.moderate', 'shared_talents.manage']);
            }
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(['shared_talents.moderate', 'shared_talents.manage']);
        }
    }

    public function down(): void
    {
        // Permissões não são removidas em rollback.
    }
};
