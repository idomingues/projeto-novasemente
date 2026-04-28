<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles') || ! Schema::hasTable('model_has_roles')) {
            return;
        }

        $guard = (string) config('auth.defaults.guard', 'web');

        $leaderRoleId = DB::table('roles')
            ->where('name', 'lider_ministerio')
            ->where('guard_name', $guard)
            ->value('id');

        $memberRoleId = DB::table('roles')
            ->where('name', 'membro')
            ->where('guard_name', $guard)
            ->value('id');

        if ($leaderRoleId === null || $memberRoleId === null) {
            return;
        }

        // Troca o role no pivot Spatie para todos os modelos User.
        DB::table('model_has_roles')
            ->where('role_id', $leaderRoleId)
            ->where('model_type', 'App\\Models\\User')
            ->update(['role_id' => $memberRoleId]);

        // Mantém `users.role_id` alinhado quando a coluna existir (espelho do primeiro papel).
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role_id')) {
            DB::table('users')
                ->where('role_id', $leaderRoleId)
                ->update(['role_id' => $memberRoleId]);
        }
    }

    public function down(): void
    {
        // Sem rollback automático: não temos como saber quais eram "membro" antes.
    }
};

