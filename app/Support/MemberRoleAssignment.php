<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

final class MemberRoleAssignment
{
    /** Papéis que só quem gere perfis globalmente ou é super admin pode atribuir. */
    private const ADMIN_LEVEL_ROLES = ['admin', 'super_admin'];

    public static function label(string $name): string
    {
        return match ($name) {
            'admin' => 'Administrador',
            'super_admin' => 'Super administrador',
            'secretaria' => 'Secretaria',
            'pastor' => 'Pastor',
            'membro' => 'Membro (app)',
            'lider_ministerio' => 'Líder de ministério',
            default => $name,
        };
    }

    /**
     * @return list<string>
     */
    public static function assignableRoleNames(?User $actor): array
    {
        if ($actor === null) {
            return [];
        }

        $guard = (string) config('auth.defaults.guard');
        $all = Role::query()
            ->where('guard_name', $guard)
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($n) => (string) $n)
            ->values()
            ->all();

        // Perfil financeiro foi removido do produto.
        $all = array_values(array_filter($all, fn (string $n) => $n !== 'financeiro'));

        // Usar `checkPermissionTo` (Spatie), não `can()` / Gate: `AppServiceProvider::Gate::before` devolve true
        // para admin/super_admin e invalidaria `can('roles.manage')` como critério de permissão real.
        if ($actor->hasRole('super_admin') || $actor->checkPermissionTo('roles.manage')) {
            return array_values(array_filter($all, fn (string $n) => $n !== 'super_admin'));
        }

        // Papel `admin` no painel sem `roles.manage` na BD: pode atribuir perfis operacionais, mas não admin/super_admin.
        if ($actor->hasRole('admin') || $actor->checkPermissionTo('members.manage')) {
            return array_values(array_filter(
                $all,
                fn (string $n) => ! in_array($n, self::ADMIN_LEVEL_ROLES, true)
            ));
        }

        return [];
    }

    public static function syncUserRole(User $actor, User $target, string $roleName): void
    {
        $roleName = trim($roleName);
        if ($roleName === '') {
            return;
        }

        if ($target->hasRole('super_admin') && ! $actor->hasRole('super_admin')) {
            abort(403, 'Não autorizado a alterar o perfil deste utilizador.');
        }

        if ($roleName === 'super_admin' && ! $actor->hasRole('super_admin')) {
            abort(403, 'Apenas super administrador pode atribuir esse perfil.');
        }

        $allowed = self::assignableRoleNames($actor);
        if (! in_array($roleName, $allowed, true)) {
            abort(403, 'Perfil de acesso inválido para o seu nível.');
        }

        $guard = (string) config('auth.defaults.guard');
        if (! Role::query()->where('name', $roleName)->where('guard_name', $guard)->exists()) {
            abort(422, 'Perfil inexistente.');
        }

        $target->syncRoles([$roleName]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $target->syncRoleIdFromSpatieAssignments();
    }
}
