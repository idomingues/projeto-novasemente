<?php

namespace App\Policies;

use App\Models\Pastor;
use App\Models\User;

class PastorPolicy
{
    private function canViewPastors(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasAnyPermission(['pastors.view', 'pastors.manage']);
    }

    private function canManagePastors(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->can('pastors.manage');
    }

    public function viewAny(User $user): bool
    {
        return $this->canViewPastors($user);
    }

    public function view(User $user, Pastor $pastor): bool
    {
        return $this->canViewPastors($user);
    }

    public function create(User $user): bool
    {
        return $this->canManagePastors($user);
    }

    public function update(User $user, Pastor $pastor): bool
    {
        return $this->canManagePastors($user);
    }

    public function updateWeeklySchedule(User $user, Pastor $pastor): bool
    {
        if ($this->canManagePastors($user)) {
            return true;
        }

        if ($pastor->user_id !== null && (int) $pastor->user_id === (int) $user->id) {
            return true;
        }

        return $pastor->userIsAgendaDelegate($user);
    }

    public function delete(User $user, Pastor $pastor): bool
    {
        return $this->canManagePastors($user);
    }
}
