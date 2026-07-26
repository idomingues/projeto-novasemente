<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\User;
use App\Support\MemberRoleAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    private const SYSTEM_ROLE_NAMES = ['super_admin', 'admin'];

    /**
     * Permissões que não entram na grade de perfis: sem módulo financeiro no produto;
     * suporte administrativo do app é só para super administrador (rotas próprias).
     */
    public static function permissionExcludedFromProfileMatrix(string $name): bool
    {
        // finance/support: fora do produto na grade; conversations: NS Conecta acessa por líder/dept, não por perfil.
        return str_starts_with($name, 'finance.')
            || str_starts_with($name, 'support.')
            || str_starts_with($name, 'conversations.');
    }

    public function index(Request $request): Response
    {
        $roles = Role::query()
            ->with(['permissions', 'users' => fn ($q) => $q->orderBy('name')->select(['users.id', 'users.name', 'users.email', 'users.photo_url'])])
            ->withCount('users')
            ->where('name', '!=', 'super_admin')
            ->orderByRaw("CASE WHEN name = 'admin' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
                'users_count' => (int) $role->users_count,
                'system_role' => in_array($role->name, self::SYSTEM_ROLE_NAMES, true),
                'users' => $role->users->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'photo_url' => $user->photo_url,
                ])->values()->all(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->filter(fn (Permission $p) => ! self::permissionExcludedFromProfileMatrix($p->name))
            ->map(fn (Permission $p) => [
                'id' => $p->id,
                'name' => $p->name,
            ])
            ->values();

        $candidateUsers = User::query()
            ->with('roles:id,name')
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'photo_url'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'photo_url' => $user->photo_url,
                'role_name' => (string) ($user->roles->pluck('name')->first() ?? ''),
            ])
            ->values();

        $moveTargets = Role::query()
            ->where('name', '!=', 'super_admin')
            ->orderByRaw("CASE WHEN name = 'membro' THEN 0 WHEN name = 'admin' THEN 1 ELSE 2 END")
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Role $role) => [
                'name' => $role->name,
                'label' => MemberRoleAssignment::label($role->name),
            ])
            ->values();

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'candidateUsers' => $candidateUsers,
            'moveTargets' => $moveTargets,
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $guard = (string) config('auth.defaults.guard');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80'],
        ]);

        $name = trim($validated['name']);

        $existing = self::findRoleByInsensitiveName($guard, $name);
        if ($existing) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            $message = $existing->name === $name
                ? 'Este perfil já existe nesta lista. Marque as permissões abaixo.'
                : 'Já existe o perfil «'.$existing->name.'» (mesmo nome com outra grafia). Marque as permissões abaixo.';

            return ListModalRedirect::toIndexEdit('roles.index', $existing, $message);
        }

        $role = Role::query()->create([
            'name' => $name,
            'guard_name' => $guard,
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return ListModalRedirect::toIndexEdit(
            'roles.index',
            $role,
            'Perfil criado. Marque as permissões na grade.',
        );
    }

    private static function findRoleByInsensitiveName(string $guard, string $name): ?Role
    {
        $trimmed = trim($name);
        if ($trimmed === '') {
            return null;
        }

        return Role::query()
            ->where('guard_name', $guard)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($trimmed)])
            ->first();
    }

    public function update(Request $request): RedirectResponse|JsonResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*.name' => ['required', 'string', 'exists:roles,name'],
            'roles.*.permissions' => ['array'],
            'roles.*.permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        foreach ($data['roles'] as $roleData) {
            if (($roleData['name'] ?? '') === 'super_admin') {
                continue;
            }
            $role = Role::where('name', $roleData['name'])->first();
            if ($role) {
                $incoming = $roleData['permissions'] ?? [];
                $assignable = array_values(array_filter(
                    $incoming,
                    fn ($name) => is_string($name) && ! self::permissionExcludedFromProfileMatrix($name)
                ));
                // Mantém permissões fora da grade (ex.: conversations / finance / support) já ligadas ao perfil.
                $preserved = $role->permissions
                    ->pluck('name')
                    ->filter(fn (string $name) => self::permissionExcludedFromProfileMatrix($name))
                    ->values()
                    ->all();
                $role->syncPermissions(array_values(array_unique([...$assignable, ...$preserved])));
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Permissões salvas.']);
        }

        return redirect()->route('roles.index')->with('success', 'Perfis atualizados com sucesso.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if (in_array($role->name, self::SYSTEM_ROLE_NAMES, true)) {
            return back()->with('error', 'Não é permitido remover perfis de sistema (administrador).');
        }

        if ($role->users()->exists()) {
            return back()->with('error', 'Este perfil está atribuído a usuários. Remova ou altere os usuários neste card antes de excluir.');
        }

        $role->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()->route('roles.index')->with('success', 'Perfil removido.');
    }

    public function attachUser(Request $request, Role $role): RedirectResponse
    {
        if ($role->name === 'super_admin') {
            abort(404);
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::query()->findOrFail((int) $validated['user_id']);
        MemberRoleAssignment::syncUserRoleFromProfilesPage($request->user(), $target, $role->name);

        return redirect()->route('roles.index')->with('success', 'Usuário incluído no perfil.');
    }

    public function updateUser(Request $request, Role $role, User $user): RedirectResponse
    {
        if ($role->name === 'super_admin') {
            abort(404);
        }

        if (! $user->hasRole($role->name)) {
            return redirect()->route('roles.index')->with('error', 'Este usuário não está neste perfil.');
        }

        $validated = $request->validate([
            'role_name' => ['required', 'string', 'exists:roles,name'],
        ]);

        $next = (string) $validated['role_name'];
        if ($next === $role->name) {
            return redirect()->route('roles.index');
        }

        MemberRoleAssignment::syncUserRoleFromProfilesPage($request->user(), $user, $next);

        return redirect()->route('roles.index')->with('success', 'Perfil do usuário atualizado.');
    }

    public function detachUser(Request $request, Role $role, User $user): RedirectResponse
    {
        if ($role->name === 'super_admin') {
            abort(404);
        }

        if (! $user->hasRole($role->name)) {
            return redirect()->route('roles.index')->with('error', 'Este usuário não está neste perfil.');
        }

        MemberRoleAssignment::clearToMemberFromProfilesPage($request->user(), $user);

        return redirect()->route('roles.index')->with('success', 'Usuário removido deste perfil.');
    }
}
