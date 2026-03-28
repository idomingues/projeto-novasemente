<?php

namespace App\Policies;

use App\Models\Pastor;
use App\Models\User;

class PastorPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['pastors.view', 'pastors.manage']);
    }

    public function view(User $user, Pastor $pastor): bool
    {
        return $user->hasAnyPermission(['pastors.view', 'pastors.manage']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('pastors.manage');
    }

    public function update(User $user, Pastor $pastor): bool
    {
        return $user->hasPermissionTo('pastors.manage');
    }

    public function delete(User $user, Pastor $pastor): bool
    {
        return $user->hasPermissionTo('pastors.manage');
    }
}
