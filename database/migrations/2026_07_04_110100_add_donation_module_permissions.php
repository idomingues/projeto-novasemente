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

        foreach (['donations.view', 'donations.manage'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        }

        $financeView = Permission::query()
            ->where('name', 'finance.view')
            ->where('guard_name', $guard)
            ->first();

        $donationsView = Permission::query()
            ->where('name', 'donations.view')
            ->where('guard_name', $guard)
            ->first();

        $donationsManage = Permission::query()
            ->where('name', 'donations.manage')
            ->where('guard_name', $guard)
            ->first();

        foreach (['admin', 'secretaria'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', $guard)->first();
            if ($role === null) {
                continue;
            }
            if ($donationsView !== null) {
                $role->givePermissionTo($donationsView);
            }
            if ($donationsManage !== null) {
                $role->givePermissionTo($donationsManage);
            }
            if ($financeView !== null) {
                $role->givePermissionTo($financeView);
            }
        }

        $superAdmin = Role::query()->where('name', 'super_admin')->where('guard_name', $guard)->first();
        if ($superAdmin !== null) {
            if ($donationsView !== null) {
                $superAdmin->givePermissionTo($donationsView);
            }
            if ($donationsManage !== null) {
                $superAdmin->givePermissionTo($donationsManage);
            }
            if ($financeView !== null) {
                $superAdmin->givePermissionTo($financeView);
            }
        }

        $tesoureiro = Role::firstOrCreate(['name' => 'financeiro', 'guard_name' => $guard]);
        $tesoureiro->syncPermissions(array_unique(array_filter([
            $financeView?->name,
            Permission::query()->where('name', 'campaigns.view')->where('guard_name', $guard)->value('name'),
            $donationsView?->name,
        ])));
    }

    public function down(): void
    {
        // não remove — pode estar em uso
    }
};
