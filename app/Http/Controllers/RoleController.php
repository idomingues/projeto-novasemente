<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $roles = Role::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
            ]);

        $permissions = Permission::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $p) => [
                'id' => $p->id,
                'name' => $p->name,
            ]);

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*.name' => ['required', 'string', 'exists:roles,name'],
            'roles.*.permissions' => ['array'],
            'roles.*.permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        foreach ($data['roles'] as $roleData) {
            $role = Role::where('name', $roleData['name'])->first();
            if ($role) {
                $role->syncPermissions($roleData['permissions'] ?? []);
            }
        }

        return redirect()->route('roles.index')->with('success', 'Perfis atualizados com sucesso.');
    }
}

