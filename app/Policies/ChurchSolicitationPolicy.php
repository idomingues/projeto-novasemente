<?php

namespace App\Policies;

use App\Http\Controllers\MobileChurchSolicitationController;
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
            if ($solicitation->type === MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL
                && $solicitation->informalPastoralLinkedMemberUserId() === null) {
                return $this->isStaff($user);
            }

            return $solicitation->member_hidden_at === null;
        }

        if ($this->isAssignedLeader($user, $solicitation)) {
            return $solicitation->leader_hidden_at === null;
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
        if ($solicitation->type === MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL) {
            return false;
        }

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

        return $solicitation->member_hidden_at === null && $solicitation->allowsChat();
    }

    public function sendMessageAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        if (! $solicitation->allowsChat()) {
            return false;
        }

        if ($this->isStaff($user)) {
            return true;
        }

        if ($this->isAssignedLeader($user, $solicitation)) {
            return $solicitation->leader_hidden_at === null;
        }

        return false;
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

    /** O membro remove a conversa da app (mantém-se no atendimento da igreja). */
    public function hideFromMemberApp(User $user, ChurchSolicitation $solicitation): bool
    {
        return (int) $solicitation->user_id === (int) $user->id;
    }

    /** O líder atribuído remove a conversa da sua lista na app. */
    public function hideFromLeaderApp(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->isAssignedLeader($user, $solicitation);
    }

    /** O requerente (líder) envia mensagens no chat enquanto o pedido estiver aberto. */
    public function chatVolunteerRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
            return false;
        }

        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->allowsChat();
    }

    /** Quem criou o pedido de voluntário (líder na área) altera enquanto está pendente. */
    public function updateVolunteerRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
            return false;
        }

        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->status === 'pending';
    }

    public function deleteVolunteerRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->updateVolunteerRequestAsSubmitter($user, $solicitation);
    }

    /** O requerente (líder) envia mensagens no chat de comunicação enquanto o pedido estiver aberto. */
    public function chatCommunicationRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return false;
        }

        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->allowsChat();
    }

    /** Quem criou a solicitação de comunicação altera enquanto está pendente. */
    public function updateCommunicationRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return false;
        }

        if ((int) $solicitation->user_id !== (int) $user->id) {
            return false;
        }

        return $solicitation->status === 'pending';
    }

    public function deleteCommunicationRequestAsSubmitter(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->updateCommunicationRequestAsSubmitter($user, $solicitation);
    }

    /** Secretaria arquiva pedidos de batismo ou de voluntário no painel (lista ativa vs arquivados). */
    public function archiveBaptismAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->archiveSolicitationAsStaff($user, $solicitation, ['baptism']);
    }

    public function archiveVolunteerRequestAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->archiveSolicitationAsStaff($user, $solicitation, [
            MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST,
        ]);
    }

    public function archiveCommunicationRequestAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        return $this->archiveSolicitationAsStaff($user, $solicitation, [
            MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST,
        ]);
    }

    /**
     * @param  list<string>  $types
     */
    private function archiveSolicitationAsStaff(User $user, ChurchSolicitation $solicitation, array $types): bool
    {
        if (! in_array($solicitation->type, $types, true)) {
            return false;
        }

        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        if (! $user->hasPermissionTo('solicitations.manage')) {
            return false;
        }

        if ($solicitation->church_id === null) {
            return false;
        }

        if ($user->church_id !== null && (int) $user->church_id !== (int) $solicitation->church_id) {
            return false;
        }

        return true;
    }

    /** Secretaria / admin com `solicitations.manage` gere pedidos de voluntário da igreja. */
    public function manageVolunteerRequestAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST) {
            return false;
        }

        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        if (! $user->hasPermissionTo('solicitations.manage')) {
            return false;
        }

        if ($solicitation->church_id === null) {
            return false;
        }

        if ($user->church_id !== null && (int) $user->church_id !== (int) $solicitation->church_id) {
            return false;
        }

        return true;
    }

    /** Comunicação / staff com `solicitations.manage` gere solicitações de comunicação. */
    public function manageCommunicationRequestAsStaff(User $user, ChurchSolicitation $solicitation): bool
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return false;
        }

        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        if (! $user->hasPermissionTo('solicitations.manage')) {
            return false;
        }

        if ($solicitation->church_id === null) {
            return false;
        }

        if ($user->church_id !== null && (int) $user->church_id !== (int) $solicitation->church_id) {
            return false;
        }

        return true;
    }
}
