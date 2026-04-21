<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Associa permissões pastorals aos papéis de painel (alinhado a RolePermissionSeeder), para BD onde as permissões foram criadas depois.
     */
    public function up(): void
    {
        $guard = config('auth.defaults.guard');
        $names = ['pastors.view', 'pastors.manage', 'pastoral_appointments.manage'];
        foreach ($names as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => $guard]
            );
        }

        $permissions = Permission::query()
            ->whereIn('name', $names)
            ->where('guard_name', $guard)
            ->get();

        $roleNames = ['super_admin', 'admin', 'secretaria', 'pastor', 'lider_ministerio'];
        foreach ($roleNames as $roleName) {
            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', $guard)
                ->first();
            if ($role !== null) {
                $role->givePermissionTo($permissions);
            }
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // não revoga — evita retirar permissões atribuídas manualmente
    }
};
