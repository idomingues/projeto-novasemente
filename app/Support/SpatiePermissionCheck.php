<?php

namespace App\Support;

use App\Models\User;
use Spatie\Permission\Exceptions\PermissionDoesNotExist;

/**
 * Evita 500 quando a permissão ainda não existe na base (ex.: produção sem migration/seeder).
 */
final class SpatiePermissionCheck
{
    public static function userHas(User $user, string $permission): bool
    {
        try {
            return $user->hasPermissionTo($permission);
        } catch (PermissionDoesNotExist) {
            return false;
        }
    }
}
