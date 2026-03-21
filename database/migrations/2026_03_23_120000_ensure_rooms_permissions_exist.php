<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * Garante permissões de salas (incl. agendamento) em instalações antigas sem reexecutar o seeder completo.
     */
    public function up(): void
    {
        $guard = config('auth.defaults.guard');
        foreach (['rooms.view', 'rooms.manage', 'rooms.schedule'] as $name) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => $guard]
            );
        }
    }

    public function down(): void
    {
        // não remove — podem estar atribuídas a perfis
    }
};
