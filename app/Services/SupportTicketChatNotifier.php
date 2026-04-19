<?php

namespace App\Services;

use App\Models\AppSupportTicket;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\SupportTicketAdminPresenter;

class SupportTicketChatNotifier
{
    /** Resposta da equipe (painel ou app como staff) → utilizador dono do ticket na app. */
    public function notifyOwnerOfStaffMessage(AppSupportTicket $ticket, User $staff): void
    {
        if (! $ticket->user_id) {
            return;
        }

        $owner = User::query()->find($ticket->user_id);
        if (! $owner) {
            return;
        }

        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $title = $ticket->type === 'pastoral' ? 'Nova mensagem sobre o seu agendamento' : 'Nova mensagem no suporte';
        $body = 'A equipe respondeu sobre: '.$typeLabel.'.';

        $row = UserInboxNotification::create([
            'user_id' => $owner->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('mobile.support.ticket', [
                'token' => $ticket->public_token,
                'inbox' => $row->id,
            ], absolute: true),
        ]);
    }

    /** Mensagem do membro na app → equipe de suporte (e pastoral, se aplicável). */
    public function notifyStaffOfUserMessage(AppSupportTicket $ticket, User $member): void
    {
        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $title = 'Nova mensagem num ticket';
        $body = $member->name.' escreveu sobre: '.$typeLabel.'.';

        foreach ($this->messageRecipientUserIds($ticket, $member->id) as $userId) {
            $this->pushInboxForStaff((int) $userId, $title, $body, $ticket->public_token);
        }
    }

    /** Novo ticket criado na app (mensagem inicial) → equipe. */
    public function notifyStaffOfNewTicket(AppSupportTicket $ticket, ?User $creator): void
    {
        if ($ticket->type === 'development') {
            return;
        }

        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $title = 'Novo pedido de suporte';
        $who = $creator?->name ?? ($ticket->guest_name ?? 'Visitante');
        $body = $who.' abriu: '.$typeLabel.'.';

        $excludeId = $creator?->id;

        foreach ($this->newTicketRecipientUserIds($ticket, $excludeId) as $userId) {
            $this->pushInboxForStaff((int) $userId, $title, $body, $ticket->public_token);
        }
    }

    /**
     * @return list<int>
     */
    private function messageRecipientUserIds(AppSupportTicket $ticket, int $senderUserId): array
    {
        $ids = SafeSpatieUsersByPermission::userIdsHavingAnyPermissionOrAdmins(
            ['support.manage'],
            $senderUserId,
        );

        if ($ticket->type === 'pastoral') {
            $ids = array_merge(
                $ids,
                SafeSpatieUsersByPermission::userIdsHavingAnyPermissionOrAdmins(
                    ['pastoral_appointments.manage'],
                    $senderUserId,
                ),
            );
        }

        return array_values(array_unique($ids));
    }

    /**
     * @return list<int>
     */
    private function newTicketRecipientUserIds(AppSupportTicket $ticket, ?int $excludeUserId): array
    {
        $ids = SafeSpatieUsersByPermission::userIdsHavingAnyPermissionOrAdmins(
            ['support.manage'],
            $excludeUserId,
        );

        if ($ticket->type === 'pastoral') {
            $ids = array_merge(
                $ids,
                SafeSpatieUsersByPermission::userIdsHavingAnyPermissionOrAdmins(
                    ['pastoral_appointments.manage'],
                    $excludeUserId,
                ),
            );
        }

        return array_values(array_unique($ids));
    }

    private function pushInboxForStaff(int $userId, string $title, string $body, string $publicToken): void
    {
        $row = UserInboxNotification::create([
            'user_id' => $userId,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('support.index', [
                'modal' => $publicToken,
                'inbox' => $row->id,
            ], absolute: true),
        ]);
    }
}
