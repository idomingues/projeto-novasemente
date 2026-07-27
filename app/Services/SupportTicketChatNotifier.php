<?php

namespace App\Services;

use App\Mail\SupportTicketStaffMessageMail;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\SupportTicketAdminPresenter;
use App\Support\UserMessagingPreferences;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Mail;

class SupportTicketChatNotifier
{
    /** Resposta da equipe (painel ou app como staff) → utilizador dono do ticket na app (e e-mail informativo). */
    public function notifyOwnerOfStaffMessage(AppSupportTicket $ticket, User $staff, string $messageContent): void
    {
        $owner = $this->findTicketOwner($ticket);
        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $title = $ticket->type === 'pastoral' ? 'Nova mensagem sobre o seu agendamento' : 'Nova mensagem no suporte';
        $body = 'A equipe respondeu sobre: '.$typeLabel.'.';

        if ($owner) {
            $this->pushOwnerInbox($owner, $ticket, $title, $body);
            $this->sendOwnerInformativeEmail($owner, $staff, $ticket, $title, $typeLabel, $messageContent);

            return;
        }

        $this->sendGuestInformativeEmail($ticket, $staff, $title, $typeLabel, $messageContent);
    }

    /** Prazo/previsão definido pela equipe → notifica o usuário dono do ticket. */
    public function notifyOwnerOfForecastSet(AppSupportTicket $ticket, User $staff, CarbonInterface $forecastAt): void
    {
        $owner = $this->findTicketOwner($ticket);
        if (! $owner) {
            return;
        }

        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $dateLabel = $forecastAt->locale('pt_BR')->translatedFormat('j \d\e F \d\e Y');
        $title = 'Prazo definido no seu chamado';
        $body = 'Informamos que o prazo previsto para o seu chamado "'.$typeLabel.'" é '.$dateLabel.'.';

        $this->pushOwnerInbox($owner, $ticket, $title, $body);
        $this->sendOwnerInformativeEmail($owner, $staff, $ticket, $title, $typeLabel, $body);
    }

    /**
     * Atualização de status e/ou solução pela equipe → caixa de entrada e e-mail (corpo com solução, se houver).
     */
    public function notifyOwnerOfTicketUpdate(
        AppSupportTicket $ticket,
        User $staff,
        bool $statusChanged,
        bool $solutionChanged,
    ): void {
        if (! $statusChanged && ! $solutionChanged) {
            return;
        }

        $owner = $this->findTicketOwner($ticket);
        if (! $owner) {
            return;
        }

        $typeLabel = SupportTicketAdminPresenter::typeLabel((string) $ticket->type);
        $statusLabel = SupportTicketAdminPresenter::statusLabel((string) $ticket->status);
        $solution = trim((string) ($ticket->solution_text ?? ''));

        if ($solutionChanged && $solution === '' && ! $statusChanged) {
            return;
        }

        $title = 'Atualização no seu chamado';
        $inboxBody = $statusChanged
            ? 'Seu chamado "'.$typeLabel.'" foi marcado como '.$statusLabel.'.'
            : 'A equipe atualizou a solução do seu chamado "'.$typeLabel.'".';

        $emailParts = [];
        if ($statusChanged) {
            $emailParts[] = 'Seu chamado "'.$typeLabel.'" foi marcado como '.$statusLabel.'.';
        }
        if ($solution !== '') {
            $emailParts[] = $solution;
        }
        $emailContent = implode("\n\n", $emailParts);
        if ($emailContent === '') {
            return;
        }

        $this->pushOwnerInbox($owner, $ticket, $title, $inboxBody);
        $this->sendOwnerInformativeEmail($owner, $staff, $ticket, $title, $typeLabel, $emailContent);
    }

    /** @deprecated Use {@see notifyOwnerOfTicketUpdate()} — mantido para chamadas legadas. */
    public function notifyOwnerOfFinalizedTicket(AppSupportTicket $ticket, User $staff, string $solutionText): void
    {
        $this->notifyOwnerOfTicketUpdate($ticket, $staff, true, trim($solutionText) !== '');
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
            'intent' => UserInboxNotification::INTENT_ACTION,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('support.index', [
                'modal' => $publicToken,
                'inbox' => $row->id,
            ], absolute: true),
        ]);
    }

    private function findTicketOwner(AppSupportTicket $ticket): ?User
    {
        if (! $ticket->user_id) {
            return null;
        }

        return User::query()->find($ticket->user_id);
    }

    private function pushOwnerInbox(User $owner, AppSupportTicket $ticket, string $title, string $body): void
    {
        if (! UserMessagingPreferences::acceptsInbox($owner)) {
            return;
        }

        $row = UserInboxNotification::create([
            'user_id' => $owner->id,
            'title' => $title,
            'body' => $body,
            'intent' => UserInboxNotification::INTENT_ACTION,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route('mobile.support.ticket', [
                'token' => $ticket->public_token,
                'inbox' => $row->id,
            ], absolute: true),
        ]);
    }

    /** E-mail de cópia informativa: sempre que exista e-mail válido na conta (além da notificação na app). */
    private function sendOwnerInformativeEmail(
        User $owner,
        User $staff,
        AppSupportTicket $ticket,
        string $title,
        string $typeLabel,
        string $messageContent,
    ): void {
        if ((int) $ticket->user_id === (int) $staff->id) {
            return;
        }

        $email = $this->resolveOwnerEmail($owner);
        if ($email === null) {
            return;
        }

        $owner->loadMissing('church:id,name');
        Mail::to($email)->send(new SupportTicketStaffMessageMail(
            $title,
            $typeLabel,
            $messageContent,
            route('mobile.support.ticket', ['token' => $ticket->public_token], absolute: true),
            $staff->name,
            $owner->church?->name,
        ));
    }

    /** Visitante sem conta: envia a resposta ao e-mail informado no chamado, se válido. */
    private function sendGuestInformativeEmail(
        AppSupportTicket $ticket,
        User $staff,
        string $title,
        string $typeLabel,
        string $messageContent,
    ): void {
        $email = $this->resolveGuestEmail($ticket);
        if ($email === null) {
            return;
        }

        Mail::to($email)->send(new SupportTicketStaffMessageMail(
            $title,
            $typeLabel,
            $messageContent,
            route('mobile.support.ticket', ['token' => $ticket->public_token], absolute: true),
            $staff->name,
            null,
        ));
    }

    private function resolveOwnerEmail(User $owner): ?string
    {
        if (is_string($owner->email) && $owner->email !== '' && filter_var($owner->email, FILTER_VALIDATE_EMAIL)) {
            return $owner->email;
        }

        return null;
    }

    private function resolveGuestEmail(AppSupportTicket $ticket): ?string
    {
        $email = trim((string) ($ticket->guest_email ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $email;
        }

        return null;
    }
}
