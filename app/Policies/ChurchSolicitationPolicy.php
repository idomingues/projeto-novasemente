<?php

namespace App\Policies;

use App\Models\ChurchSolicitation;
use App\Models\User;

class ChurchSolicitationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['solicitations.view', 'solicitations.manage']);
    }

    public function view(User $user, ChurchSolicitation $solicitation): bool
    {
        if ((int) $solicitation->user_id === (int) $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['solicitations.view', 'solicitations.manage']);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ChurchSolicitation $solicitation): bool
    {
        return $user->hasPermissionTo('solicitations.manage');
    }

    public function sendMessageAsMember(User $user, ChurchSolicitation $solicitation): bool
    {
        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->allowsChat();
    }

    public function sendMessageAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        if (! $user->hasAnyPermission(['solicitations.view', 'solicitations.manage'])) {
            return false;
        }

        return $solicitation->allowsChat();
    }
}
