<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
        return str_starts_with($name, 'finance.') || str_starts_with($name, 'support.');
    }

    public function index(Request $request): Response
    {
        $roles = Role::query()
            ->with('permissions')
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

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $guard = (string) config('auth.defaults.guard');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('roles', 'name')->where(fn ($q) => $q->where('guard_name', $guard)),
            ],
        ], [
            'name.regex' => 'Use apenas letras minúsculas, números e sublinhado, começando por letra (ex.: coordenador_som).',
        ]);

        Role::query()->create([
            'name' => $validated['name'],
            'guard_name' => $guard,
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()->route('roles.index')->with('success', 'Perfil criado. Marque as permissões e clique em «Salvar perfis».');
    }

    public function update(Request $request): RedirectResponse
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
                $role->syncPermissions($assignable);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()->route('roles.index')->with('success', 'Perfis atualizados com sucesso.');
    }

    public function destroy(Role $role): RedirectResponse
    {
        if (in_array($role->name, self::SYSTEM_ROLE_NAMES, true)) {
            return back()->with('error', 'Não é permitido remover perfis de sistema (administrador).');
        }

        if ($role->users()->exists()) {
            return back()->with('error', 'Este perfil está atribuído a usuários. Altere o perfil em Voluntários antes de excluir.');
        }

        $role->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return redirect()->route('roles.index')->with('success', 'Perfil removido.');
    }
}
