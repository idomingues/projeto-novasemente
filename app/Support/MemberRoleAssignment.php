<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

final class MemberRoleAssignment
{
    /** Papéis que só quem gere perfis globalmente ou é super admin pode atribuir. */
    private const ADMIN_LEVEL_ROLES = ['admin', 'super_admin'];

    /** Perfil legado removido: liderança é `users.is_ministry_leader` + `ministry_user`. */
    public const RETIRED_LEADER_ROLE = 'lider_ministerio';

    public static function label(string $name): string
    {
        return match ($name) {
            'admin' => 'Administrador',
            'super_admin' => 'Super administrador',
            'secretaria' => 'Secretaria',
            'pastor' => 'Pastor',
            'membro' => 'Usuário (app)',
            self::RETIRED_LEADER_ROLE => 'Líder de ministério',
            'financeiro' => 'Financeiro',
            default => str_replace('_', ' ', $name),
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

        // Perfis fora do produto / legado.
        $all = array_values(array_filter(
            $all,
            fn (string $n) => ! in_array($n, ['financeiro', self::RETIRED_LEADER_ROLE], true)
        ));

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
            if ($target->hasRole('super_admin') && ! $actor->hasRole('super_admin')) {
                abort(403, 'Não autorizado a alterar o perfil deste usuário.');
            }

            $target->syncRoles([]);
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            $target->syncRoleIdFromSpatieAssignments();

            return;
        }

        if ($target->hasRole('super_admin') && ! $actor->hasRole('super_admin')) {
            abort(403, 'Não autorizado a alterar o perfil deste usuário.');
        }

        if ($roleName === 'super_admin' && ! $actor->hasRole('super_admin')) {
            abort(403, 'Apenas super administrador pode atribuir esse perfil.');
        }

        if ($roleName === self::RETIRED_LEADER_ROLE) {
            abort(422, 'Líder de ministério não é mais um perfil. Use a propriedade Líder no cadastro do usuário.');
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

    /**
     * Atribuição na tela Perfis (só super administrador): aceita perfis customizados e legado.
     */
    public static function syncUserRoleFromProfilesPage(User $actor, User $target, string $roleName): void
    {
        if (! $actor->hasRole('super_admin')) {
            abort(403, 'Apenas super administrador pode gerir usuários nesta tela.');
        }

        $roleName = trim($roleName);
        if ($roleName === 'super_admin' || $roleName === self::RETIRED_LEADER_ROLE) {
            abort(403, 'Perfil inválido.');
        }

        if ($roleName === '') {
            self::clearToMemberFromProfilesPage($actor, $target);

            return;
        }

        if ($target->hasRole('super_admin')) {
            abort(403, 'Não é permitido alterar o perfil de um super administrador.');
        }

        $guard = (string) config('auth.defaults.guard');
        if (! Role::query()->where('name', $roleName)->where('guard_name', $guard)->exists()) {
            abort(422, 'Perfil inexistente.');
        }

        $target->syncRoles([$roleName]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $target->syncRoleIdFromSpatieAssignments();
    }

    /**
     * Remove o perfil de painel — conta fica sem perfil Spatie (só app / propriedade Líder).
     */
    public static function clearToMemberFromProfilesPage(User $actor, User $target): void
    {
        if (! $actor->hasRole('super_admin')) {
            abort(403, 'Apenas super administrador pode gerir usuários nesta tela.');
        }

        if ($target->hasRole('super_admin')) {
            abort(403, 'Não é permitido alterar o perfil de um super administrador.');
        }

        $target->syncRoles([]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $target->syncRoleIdFromSpatieAssignments();
    }

    /**
     * Marca a propriedade Líder — sem atribuir perfil Spatie.
     */
    public static function applyMinistryLeaderRole(User $user): void
    {
        self::stripRetiredLeaderRole($user);
        $user->forceFill(['is_ministry_leader' => true])->save();
        $user->syncVolunteerRecord();
    }

    /**
     * Remove a propriedade Líder. Contas de equipe do painel mantêm o perfil Spatie.
     */
    public static function clearMinistryLeaderRole(User $user): void
    {
        self::stripRetiredLeaderRole($user);
        $user->forceFill(['is_ministry_leader' => false])->save();
        $user->syncVolunteerRecord();
    }

    /**
     * Remove papel Spatie legado `lider_ministerio` se ainda existir na conta.
     */
    public static function stripRetiredLeaderRole(User $user): void
    {
        if (! $user->hasRole(self::RETIRED_LEADER_ROLE)) {
            return;
        }

        $remaining = $user->getRoleNames()
            ->map(fn ($n) => (string) $n)
            ->reject(fn (string $n) => $n === self::RETIRED_LEADER_ROLE)
            ->values()
            ->all();

        $user->syncRoles($remaining);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->syncRoleIdFromSpatieAssignments();
    }
}
