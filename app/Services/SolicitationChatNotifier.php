<?php

namespace App\Services;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Mail\SolicitationNewRequestMail;
use App\Mail\SolicitationStaffMessageMail;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Support\CommunicationRequestOptions;
use App\Support\LeaderOperationalNotifications;
use App\Support\SafeSpatieUsersByPermission;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SolicitationChatNotifier
{
    /**
     * @return \Illuminate\Support\Collection<int, \App\Models\User>
     */
    private function staffRecipientsForChurch(?int $churchId, ?int $excludeUserId = null): \Illuminate\Support\Collection
    {
        $users = SafeSpatieUsersByPermission::usersHavingAnyPermissionOrAdmins(
            ['solicitations.view', 'solicitations.manage'],
            $excludeUserId,
        );

        if ($churchId === null) {
            return $users;
        }

        return $users->filter(function (User $u) use ($churchId) {
            if ($u->hasRole('super_admin')) {
                return true;
            }

            return (int) ($u->church_id ?? 0) === (int) $churchId;
        })->values();
    }

    /** Aviso ao membro quando a igreja (staff) ou o líder envia uma mensagem no chat. */
    public function notifyMemberOfStaffMessage(ChurchSolicitation $solicitation, User $staff, string $messageContent): void
    {
        $owner = User::query()->find($solicitation->user_id);
        if (! $owner) {
            return;
        }

        $selfMessage = (int) $owner->id === (int) $staff->id;

        $typeLabel = MobileChurchSolicitationController::typeLabel($solicitation->type);
        $isLeaderChat = $solicitation->type === 'leader_chat';
        $subjectLine = $isLeaderChat && $solicitation->subject
            ? (string) $solicitation->subject
            : $typeLabel;

        $title = $isLeaderChat ? 'Nova mensagem do líder' : 'Nova mensagem da igreja';
        $body = $isLeaderChat
            ? 'Resposta sobre: '.$subjectLine.'.'
            : 'Sobre o seu pedido: '.$typeLabel.'.';

        $conversationUrl = $isLeaderChat
            ? route('mobile.contact', [
                'solicitacao' => $solicitation->id,
                'painel' => 'chat',
            ], absolute: true)
            : route('mobile.solicitations.show', [
                'solicitation' => $solicitation->id,
            ], absolute: true);

        if (UserMessagingPreferences::acceptsInbox($owner)) {
            $row = UserInboxNotification::create([
                'user_id' => $owner->id,
                'title' => $title,
                'body' => $body,
                'intent' => UserInboxNotification::INTENT_ACTION,
                'action_url' => null,
            ]);

            $conversationUrl = $isLeaderChat
                ? route('mobile.contact', [
                    'solicitacao' => $solicitation->id,
                    'painel' => 'chat',
                    'inbox' => $row->id,
                ], absolute: true)
                : route('mobile.solicitations.show', [
                    'solicitation' => $solicitation->id,
                    'inbox' => $row->id,
                ], absolute: true);

            $row->update([
                'action_url' => $conversationUrl,
            ]);
        }

        /** E-mail de cópia informativa: sempre que exista e-mail válido na conta (além da notificação na app). */
        if (! $selfMessage) {
            $email = $this->resolveMemberEmail($owner);
            if ($email !== null) {
                $solicitation->loadMissing('church:id,name');
                Mail::to($email)->send(new SolicitationStaffMessageMail(
                    $subjectLine,
                    $messageContent,
                    $conversationUrl,
                    $isLeaderChat,
                    $solicitation->church?->name,
                    $staff->name,
                ));
            }
        }
    }

    /** Aviso aos utilizadores com acesso à inbox quando o membro responde. */
    public function notifyStaffOfMemberMessage(ChurchSolicitation $solicitation, User $member): void
    {
        $typeLabel = MobileChurchSolicitationController::typeLabel($solicitation->type);
        $title = 'Nova mensagem num pedido';
        $body = $member->name.' respondeu sobre: '.$typeLabel.'.';

        if ($solicitation->type === 'leader_chat' && $solicitation->assigned_volunteer_id) {
            $leader = Volunteer::query()
                ->whereKey($solicitation->assigned_volunteer_id)
                ->with(['user:id,is_ministry_leader'])
                ->first();
            $leaderUser = $leader?->user;
            if (
                $leaderUser
                && LeaderOperationalNotifications::userShouldReceive($leaderUser)
                && (int) $leaderUser->id !== (int) $member->id
            ) {
                $subjectLine = $solicitation->subject ? (string) $solicitation->subject : $typeLabel;
                $this->pushInboxForUser(
                    (int) $leaderUser->id,
                    'Nova mensagem do membro',
                    'Resposta sobre: '.$subjectLine.'.',
                    'mobile.leader-solicitations.show',
                    ['solicitation' => $solicitation->id],
                );

                return;
            }
        }

        $staffUsers = $this->staffRecipientsForChurch(
            $solicitation->church_id !== null ? (int) $solicitation->church_id : null,
            $member->id,
        );

        $isVolunteerRequest = $solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST;
        $isCommunicationRequest = $solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST;
        $staffRoute = $isVolunteerRequest
            ? 'ministry-lead.volunteers.pedidos'
            : ($isCommunicationRequest ? 'communication-requests.index' : 'solicitations.index');
        $staffParams = $isVolunteerRequest
            ? []
            : ($isCommunicationRequest ? [] : [
                'modal_kind' => 'solicitation',
                'modal_id' => $solicitation->id,
            ]);

        foreach ($staffUsers as $user) {
            $this->pushInboxForUser(
                (int) $user->id,
                $title,
                $body,
                $staffRoute,
                $staffParams,
            );
        }
    }

    /** Quando um membro abre conversa com um líder (Mais → Falar com líder). */
    public function notifyAssignedLeaderOfNewRequest(ChurchSolicitation $solicitation): void
    {
        if ($solicitation->type !== 'leader_chat' || ! $solicitation->assigned_volunteer_id) {
            return;
        }

        $volunteer = Volunteer::query()
            ->whereKey($solicitation->assigned_volunteer_id)
            ->with(['user:id,name,email,is_ministry_leader'])
            ->first();
        if (! $volunteer?->user_id) {
            return;
        }

        $leaderUser = $volunteer->user;
        if (! $leaderUser || ! LeaderOperationalNotifications::userShouldReceive($leaderUser)) {
            return;
        }

        $leaderUserId = (int) $leaderUser->id;

        $member = User::query()->find($solicitation->user_id);
        $memberName = $member?->name ?? 'Um membro';

        $this->pushInboxForUser(
            $leaderUserId,
            'Novo pedido de conversa',
            $memberName.' quer falar consigo (líder de ministério).',
            'mobile.leader-solicitations.show',
            ['solicitation' => $solicitation->id],
        );

        $typeLabel = $solicitation->subject
            ? (string) $solicitation->subject
            : MobileChurchSolicitationController::typeLabel($solicitation->type);
        $inboxUrl = route('mobile.leader-solicitations.show', ['solicitation' => $solicitation->id], absolute: true);
        if (UserMessagingPreferences::acceptsEmailForVolunteerContact($volunteer)) {
            $email = $this->resolveVolunteerContactEmail($volunteer);
            if ($email !== null) {
                Mail::to($email)->send(new SolicitationNewRequestMail(
                    'Novo pedido de conversa — '.$typeLabel,
                    'Novo pedido de conversa',
                    $memberName.' iniciou uma conversa consigo na app.',
                    $this->solicitationMessagePreview($solicitation),
                    $inboxUrl,
                ));
            }
        }
    }

    /** Nova solicitação de comunicação: inbox + e-mail dedicado da equipe. */
    public function notifyCommunicationTeamOfNewRequest(ChurchSolicitation $solicitation, int $churchId): void
    {
        if ($solicitation->type !== MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            return;
        }

        $this->notifyChurchSolicitationsHandlerOfNewRequest($solicitation, $churchId);

        $notifyEmail = config('communication.notify_email');
        if (! is_string($notifyEmail) || ! filter_var($notifyEmail, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        $member = User::query()->find($solicitation->user_id);
        $memberName = $member?->name ?? 'Alguém';
        $demandLabel = CommunicationRequestOptions::demandTypeLabel(
            (string) (($solicitation->meta ?? [])['communication_demand_type'] ?? ''),
        );
        $inboxUrl = route('communication-requests.index', [], absolute: true);

        Mail::to($notifyEmail)->send(new SolicitationNewRequestMail(
            'Nova solicitação de comunicação — '.$demandLabel,
            'Nova solicitação de comunicação',
            $memberName.' abriu um pedido («'.$demandLabel.'»).',
            CommunicationRequestOptions::emailPreview($solicitation),
            $inboxUrl,
        ));
    }

    /**
     * Responsável configurado em Definições da igreja (pedidos gerais, não «Falar com líder»).
     */
    public function notifyChurchSolicitationsHandlerOfNewRequest(ChurchSolicitation $solicitation, int $churchId, ?int $batchCount = null): void
    {
        if ($solicitation->type === 'leader_chat') {
            return;
        }

        $isVolunteerRequest = $solicitation->type === MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST;
        $isCommunicationRequest = $solicitation->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST;
        $staffInboxRoute = $isVolunteerRequest
            ? 'ministry-lead.volunteers.pedidos'
            : ($isCommunicationRequest ? 'communication-requests.index' : 'solicitations.index');
        $staffInboxParams = $isVolunteerRequest
            ? []
            : ($isCommunicationRequest ? [] : [
                'modal_kind' => 'solicitation',
                'modal_id' => $solicitation->id,
            ]);

        $church = Church::query()->find($churchId);
        $handlerVolunteerId = $church?->solicitations_handler_volunteer_id;
        if (! $handlerVolunteerId) {
            return;
        }

        $volunteer = Volunteer::query()
            ->whereKey((int) $handlerVolunteerId)
            ->where('active', true)
            ->with(['user:id,name,email'])
            ->first();
        if (! $volunteer?->user_id) {
            return;
        }

        $member = User::query()->find($solicitation->user_id);
        $memberName = $member?->name ?? 'Um membro';
        $typeLabel = MobileChurchSolicitationController::typeLabel($solicitation->type);

        $batchSuffix = ($batchCount !== null && $batchCount > 1)
            ? sprintf(' Foram criados %d pedidos em sequência (uma linha por pessoa a anexar na secretaria).', $batchCount)
            : '';

        $this->pushInboxForUser(
            (int) $volunteer->user_id,
            'Novo pedido na app',
            $memberName.' enviou: '.$typeLabel.'.'.$batchSuffix,
            $staffInboxRoute,
            $staffInboxParams,
        );

        // Também notifica a equipe com acesso ao painel (Atendimento Pastoral ou Pedidos de voluntário).
        $staffUsers = $this->staffRecipientsForChurch($churchId, $solicitation->user_id);
        foreach ($staffUsers as $user) {
            // Evita duplicar a mesma notificação para o responsável, se ele também for staff.
            if ((int) $user->id === (int) $volunteer->user_id) {
                continue;
            }
            $this->pushInboxForUser(
                (int) $user->id,
                'Novo pedido na app',
                $memberName.' enviou: '.$typeLabel.'.'.$batchSuffix,
                $staffInboxRoute,
                $staffInboxParams,
            );
        }

        if (UserMessagingPreferences::acceptsEmailForVolunteerContact($volunteer)) {
            $email = $this->resolveVolunteerContactEmail($volunteer);
            if ($email !== null) {
                $inboxUrl = route($staffInboxRoute, $staffInboxParams, absolute: true);
                $emailBody = $memberName.' enviou um pedido do tipo «'.$typeLabel.'».';
                if ($batchCount !== null && $batchCount > 1) {
                    $emailBody .= sprintf(' Foram abertas %d linhas de pedido (quantidade pedida).', $batchCount);
                }
                Mail::to($email)->send(new SolicitationNewRequestMail(
                    'Novo pedido — '.$typeLabel,
                    'Novo pedido na app',
                    $emailBody,
                    $this->solicitationMessagePreview($solicitation),
                    $inboxUrl,
                ));
            }
        }
    }

    /**
     * @param  array<string, mixed>  $routeParams
     */
    private function pushInboxForUser(int $userId, string $title, string $body, string $routeName, array $routeParams): void
    {
        $user = User::query()->find($userId);
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return;
        }

        $row = UserInboxNotification::create([
            'user_id' => $userId,
            'title' => $title,
            'body' => $body,
            'intent' => UserInboxNotification::INTENT_ACTION,
            'action_url' => null,
        ]);

        $row->update([
            'action_url' => route($routeName, array_merge($routeParams, ['inbox' => $row->id]), absolute: true),
        ]);
    }

    private function resolveMemberEmail(User $owner): ?string
    {
        if ($owner->email && filter_var($owner->email, FILTER_VALIDATE_EMAIL)) {
            return $owner->email;
        }

        return null;
    }

    private function resolveVolunteerContactEmail(Volunteer $volunteer): ?string
    {
        $raw = $volunteer->email;
        if (is_string($raw) && $raw !== '' && filter_var($raw, FILTER_VALIDATE_EMAIL)) {
            return $raw;
        }

        $user = $volunteer->relationLoaded('user') ? $volunteer->user : User::query()->find($volunteer->user_id);
        if ($user?->email && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return $user->email;
        }

        return null;
    }

    private function solicitationMessagePreview(ChurchSolicitation $solicitation): string
    {
        $text = trim((string) $solicitation->message);

        return Str::limit($text, 800);
    }
}
