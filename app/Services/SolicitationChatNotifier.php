<?php

namespace App\Services;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Mail\SolicitationNewRequestMail;
use App\Mail\SolicitationStaffMessageMail;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\Member;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SolicitationChatNotifier
{
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

        $row = UserInboxNotification::create([
            'user_id' => $owner->id,
            'title' => $title,
            'body' => $body,
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

        if (! $selfMessage) {
            $email = $this->resolveMemberEmail($owner);
            if ($email !== null) {
                Mail::to($email)->send(new SolicitationStaffMessageMail(
                    $subjectLine,
                    $messageContent,
                    $conversationUrl,
                    $isLeaderChat,
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
            $leaderUserId = Volunteer::query()
                ->whereKey($solicitation->assigned_volunteer_id)
                ->value('user_id');
            if ($leaderUserId && (int) $leaderUserId !== (int) $member->id) {
                $subjectLine = $solicitation->subject ? (string) $solicitation->subject : $typeLabel;
                $this->pushInboxForUser(
                    (int) $leaderUserId,
                    'Nova mensagem do membro',
                    'Resposta sobre: '.$subjectLine.'.',
                    'mobile.leader-solicitations.show',
                    ['solicitation' => $solicitation->id],
                );

                return;
            }
        }

        $staffUsers = User::query()
            ->permission(['solicitations.view', 'solicitations.manage'])
            ->where('id', '!=', $member->id)
            ->get();

        foreach ($staffUsers as $user) {
            $this->pushInboxForUser(
                (int) $user->id,
                $title,
                $body,
                'solicitations.index',
                [
                    'modal_kind' => 'solicitation',
                    'modal_id' => $solicitation->id,
                ],
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
            ->with(['user:id,name,email'])
            ->first();
        if (! $volunteer?->user_id) {
            return;
        }

        $leaderUserId = (int) $volunteer->user_id;

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

    /**
     * Responsável configurado em Definições da igreja (pedidos gerais, não «Falar com líder»).
     */
    public function notifyChurchSolicitationsHandlerOfNewRequest(ChurchSolicitation $solicitation, int $churchId): void
    {
        if ($solicitation->type === 'leader_chat') {
            return;
        }

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

        $this->pushInboxForUser(
            (int) $volunteer->user_id,
            'Novo pedido na app',
            $memberName.' enviou: '.$typeLabel.'.',
            'solicitations.index',
            [
                'modal_kind' => 'solicitation',
                'modal_id' => $solicitation->id,
            ],
        );

        $email = $this->resolveVolunteerContactEmail($volunteer);
        if ($email !== null) {
            $inboxUrl = route('solicitations.index', [
                'modal_kind' => 'solicitation',
                'modal_id' => $solicitation->id,
            ], absolute: true);
            Mail::to($email)->send(new SolicitationNewRequestMail(
                'Novo pedido — '.$typeLabel,
                'Novo pedido na app',
                $memberName.' enviou um pedido do tipo «'.$typeLabel.'».',
                $this->solicitationMessagePreview($solicitation),
                $inboxUrl,
            ));
        }
    }

    /**
     * @param  array<string, mixed>  $routeParams
     */
    private function pushInboxForUser(int $userId, string $title, string $body, string $routeName, array $routeParams): void
    {
        $row = UserInboxNotification::create([
            'user_id' => $userId,
            'title' => $title,
            'body' => $body,
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

        if ($owner->member_id) {
            $member = Member::query()->find($owner->member_id);
            if ($member?->email && filter_var($member->email, FILTER_VALIDATE_EMAIL)) {
                return $member->email;
            }
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

        if ($volunteer->member_id) {
            $member = Member::query()->find($volunteer->member_id);
            if ($member?->email && filter_var($member->email, FILTER_VALIDATE_EMAIL)) {
                return $member->email;
            }
        }

        return null;
    }

    private function solicitationMessagePreview(ChurchSolicitation $solicitation): string
    {
        $text = trim((string) $solicitation->message);

        return Str::limit($text, 800);
    }
}
