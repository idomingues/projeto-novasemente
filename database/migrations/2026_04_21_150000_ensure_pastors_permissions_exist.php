<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Garante permissões do módulo pastoral em instalações antigas sem reexecutar o seeder completo.
     */
    public function up(): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['pastors.view', 'pastors.manage', 'pastoral_appointments.manage'] as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => $guard]
            );
        }

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // não remove — podem estar atribuídas a perfis
    }
};
