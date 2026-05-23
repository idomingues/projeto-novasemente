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

        foreach (['campaigns.view', 'campaigns.manage'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        $financeView = Permission::query()
            ->where('name', 'finance.view')
            ->where('guard_name', $guard)
            ->first();

        $campaignsView = Permission::query()
            ->where('name', 'campaigns.view')
            ->where('guard_name', $guard)
            ->first();

        $campaignsManage = Permission::query()
            ->where('name', 'campaigns.manage')
            ->where('guard_name', $guard)
            ->first();

        foreach (['admin', 'secretaria'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role === null) {
                continue;
            }
            if ($campaignsView !== null) {
                $role->givePermissionTo($campaignsView);
            }
            if ($campaignsManage !== null) {
                $role->givePermissionTo($campaignsManage);
            }
            if ($financeView !== null) {
                $role->givePermissionTo($financeView);
            }
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin !== null) {
            if ($campaignsView !== null) {
                $superAdmin->givePermissionTo($campaignsView);
            }
            if ($campaignsManage !== null) {
                $superAdmin->givePermissionTo($campaignsManage);
            }
            if ($financeView !== null) {
                $superAdmin->givePermissionTo($financeView);
            }
        }

        $tesoureiro = Role::firstOrCreate(['name' => 'financeiro', 'guard_name' => $guard]);
        $tesoureiro->syncPermissions(array_filter([
            $financeView?->name,
            $campaignsView?->name,
        ]));
    }

    public function down(): void
    {
        // não remove — pode estar em uso
    }
};
