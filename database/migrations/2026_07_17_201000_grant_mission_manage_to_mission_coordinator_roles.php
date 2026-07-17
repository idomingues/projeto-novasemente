<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Perfis customizados de coordenação da Área de Missão costumavam receber só
 * mission.view — dava para entrar no painel, mas sem «Gerir fases» nem movimentar
 * voluntários. Garante mission.manage nesses perfis (sem alterar pastor).
 */
return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard');
        $view = Permission::findOrCreate('mission.view', $guard);
        $manage = Permission::findOrCreate('mission.manage', $guard);

        $roles = Role::query()
            ->where('guard_name', $guard)
            ->where('name', '!=', 'pastor')
            ->whereHas('permissions', fn ($q) => $q->where('name', 'mission.view'))
            ->whereDoesntHave('permissions', fn ($q) => $q->where('name', 'mission.manage'))
            ->get();

        foreach ($roles as $role) {
            if (! $this->looksLikeMissionCoordinatorRole($role)) {
                continue;
            }

            $role->givePermissionTo([$view, $manage]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Não remove mission.manage: pode ter sido concedido de propósito depois.
    }

    private function looksLikeMissionCoordinatorRole(Role $role): bool
    {
        $normalized = mb_strtolower((string) $role->name);
        $normalized = strtr($normalized, [
            'á' => 'a',
            'à' => 'a',
            'ã' => 'a',
            'â' => 'a',
            'é' => 'e',
            'ê' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ô' => 'o',
            'õ' => 'o',
            'ú' => 'u',
            'ç' => 'c',
        ]);

        if (str_contains($normalized, 'missao') || str_contains($normalized, 'coordenador')) {
            return true;
        }

        $permissionNames = $role->permissions->pluck('name')->all();

        // Perfil só com permissões de Missão = coordenação da área.
        return $permissionNames !== []
            && collect($permissionNames)->every(fn (string $name) => str_starts_with($name, 'mission.'));
    }
};
