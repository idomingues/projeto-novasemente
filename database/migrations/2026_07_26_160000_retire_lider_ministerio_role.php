<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Liderança deixa de ser perfil Spatie: vira propriedade `is_ministry_leader`.
 * Usuários com `lider_ministerio` passam a ficar sem perfil Spatie (com a flag de líder).
 * O papel `lider_ministerio` é removido.
 */
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

        if ($leaderRoleId === null) {
            return;
        }

        $userIds = DB::table('model_has_roles')
            ->where('role_id', $leaderRoleId)
            ->where('model_type', User::class)
            ->pluck('model_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($userIds !== [] && Schema::hasColumn('users', 'is_ministry_leader')) {
            DB::table('users')
                ->whereIn('id', $userIds)
                ->update(['is_ministry_leader' => true]);
        }

        DB::table('model_has_roles')
            ->where('role_id', $leaderRoleId)
            ->delete();

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'role_id')) {
            DB::table('users')
                ->where('role_id', $leaderRoleId)
                ->update(['role_id' => null]);
        }

        if (Schema::hasTable('role_has_permissions')) {
            DB::table('role_has_permissions')->where('role_id', $leaderRoleId)->delete();
        }

        DB::table('roles')->where('id', $leaderRoleId)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Sem rollback: o papel legado e as atribuições não são recriados.
    }
};
