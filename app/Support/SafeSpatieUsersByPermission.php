<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

final class SafeSpatieUsersByPermission
{
    /**
     * Utilizadores com qualquer uma das permissões (Spatie). Nomes em falta na tabela
     * `permissions` são ignorados; se nenhum existir, usa papéis `super_admin` e `admin`.
     *
     * @param  list<string>  $permissionNames
     * @return Collection<int, User>
     */
    public static function usersHavingAnyPermissionOrAdmins(array $permissionNames, ?int $excludeUserId = null): Collection
    {
        $guard = config('auth.defaults.guard');
        $existing = Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('name', $permissionNames)
            ->pluck('name')
            ->all();

        $base = User::query();
        if ($excludeUserId !== null) {
            $base->where('id', '!=', $excludeUserId);
        }

        if ($existing === []) {
            return $base
                ->whereHas('roles', fn ($q) => $q->whereIn('name', ['super_admin', 'admin']))
                ->get();
        }

        $merged = collect();
        foreach ($existing as $name) {
            $q = User::query();
            if ($excludeUserId !== null) {
                $q->where('id', '!=', $excludeUserId);
            }
            $merged = $merged->merge($q->permission($name)->get());
        }

        return $merged->unique('id')->values();
    }

    /**
     * @param  list<string>  $permissionNames
     * @return list<int>
     */
    public static function userIdsHavingAnyPermissionOrAdmins(array $permissionNames, ?int $excludeUserId = null): array
    {
        return self::usersHavingAnyPermissionOrAdmins($permissionNames, $excludeUserId)
            ->pluck('id')
            ->map(fn (int|string $id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }
}
