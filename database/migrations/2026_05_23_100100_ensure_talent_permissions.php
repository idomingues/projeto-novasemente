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
        $names = ['talents.moderate', 'talents.treasurer'];

        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        foreach (['admin', 'secretaria', 'super_admin'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role) {
                $role->givePermissionTo(['talents.moderate', 'talents.treasurer']);
            }
        }

        $financeiro = Role::query()->where('name', 'financeiro')->where('guard_name', $guard)->first();
        if ($financeiro) {
            $financeiro->givePermissionTo('talents.treasurer');
        }
    }

    public function down(): void
    {
        // Permissões não são removidas em rollback.
    }
};
