<?php

namespace App\Policies;

use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Models\Volunteer;

class ChurchSolicitationPolicy
{
    private function isStaff(User $user): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasAnyPermission(['solicitations.view', 'solicitations.manage']);
    }

    private function isAssignedLeader(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== 'leader_chat' || ! $solicitation->assigned_volunteer_id) {
            return false;
        }

        $leaderUserId = Volunteer::query()
            ->whereKey($solicitation->assigned_volunteer_id)
            ->value('user_id');

        return $leaderUserId !== null && (int) $leaderUserId === (int) $user->id;
    }

    public function viewAny(User $user): bool
    {
        return $this->isStaff($user);
    }

    public function view(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->church_id !== null && $user->church_id !== null) {
            if ((int) $solicitation->church_id !== (int) $user->church_id && ! $user->hasRole('super_admin')) {
                return false;
            }
        }

        if ((int) $solicitation->user_id === (int) $user->id) {
            return true;
        }

        if ($this->isAssignedLeader($user, $solicitation)) {
            return true;
        }

        return $this->isStaff($user);
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->hasPermissionTo('solicitations.manage');
    }

    /** Membro edita o próprio texto/datas enquanto o pedido está pendente. */
    public function updateAsMember(User $user, ChurchSolicitation $solicitation): bool
    {
        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->status === 'pending';
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
        if (! $solicitation->allowsChat()) {
            return false;
        }

        return $this->isStaff($user) || $this->isAssignedLeader($user, $solicitation);
    }

    /** Membro ou líder atribuído encerra o assunto (conversa com líder). */
    public function finalizeLeaderChat(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== 'leader_chat') {
            return false;
        }

        if (! in_array($solicitation->status, ['pending', 'in_progress'], true)) {
            return false;
        }

        if ((int) $solicitation->user_id === (int) $user->id) {
            return true;
        }

        return $this->isAssignedLeader($user, $solicitation);
    }
}
