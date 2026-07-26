<?php

namespace App\Services;

use App\Models\ChurchConversation;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\NsWhatsAccess;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Str;

class ConversationNotifier
{
    public function notifyNewConversation(ChurchConversation $conversation): void
    {
        $memberName = $conversation->member?->name ?? 'Membro';
        $ministry = $conversation->currentMinistry?->name ?? 'Departamento';
        $title = 'Nova conversa no NS Whats';
        $body = "{$memberName} iniciou uma conversa com {$ministry}.";

        foreach ($this->staffRecipients($conversation) as $user) {
            $this->pushInbox($user, $title, $body, $this->staffActionUrl($conversation));
        }
    }

    public function notifyStaffOfMemberMessage(ChurchConversation $conversation, User $member, ?string $content = null): void
    {
        $title = 'Nova mensagem no NS Whats';
        $preview = $content !== null && trim($content) !== ''
            ? Str::limit($member->name.': '.trim($content), 140)
            : ($member->name).' respondeu na conversa.';

        foreach ($this->staffRecipients($conversation) as $user) {
            if ((int) $user->id === (int) $member->id) {
                continue;
            }
            $this->pushInbox($user, $title, $preview, $this->staffActionUrl($conversation));
        }
    }

    public function notifyMemberOfStaffMessage(ChurchConversation $conversation, User $staff, string $content): void
    {
        $member = $conversation->member ?? User::query()->find($conversation->member_user_id);
        if (! $member || (int) $member->id === (int) $staff->id) {
            return;
        }

        $this->pushInbox(
            $member,
            'Nova mensagem no NS Whats',
            Str::limit($staff->name.': '.$content, 140),
            $this->memberActionUrl($conversation),
        );
    }

    public function notifyMemberOfAssigneeChange(ChurchConversation $conversation): void
    {
        $member = $conversation->member ?? User::query()->find($conversation->member_user_id);
        if (! $member) {
            return;
        }
        $name = $conversation->assignee?->name ?? 'um líder';
        $this->pushInbox(
            $member,
            'NS Whats — responsável atualizado',
            "{$name} está acompanhando sua conversa.",
            $this->memberActionUrl($conversation),
        );
    }

    public function notifyLeaderOfTransfer(ChurchConversation $conversation, User $toLeader): void
    {
        $this->pushInbox(
            $toLeader,
            'Conversa transferida no NS Whats',
            'Uma conversa foi transferida para você.',
            $this->staffActionUrl($conversation),
        );
    }

    public function notifyMemberOfForward(ChurchConversation $conversation, string $from, string $to): void
    {
        $member = $conversation->member ?? User::query()->find($conversation->member_user_id);
        if (! $member) {
            return;
        }
        $this->pushInbox(
            $member,
            'Conversa encaminhada',
            "Sua conversa foi encaminhada de {$from} para {$to}.",
            $this->memberActionUrl($conversation),
        );
    }

    public function notifyDepartmentOfForward(ChurchConversation $conversation): void
    {
        foreach ($this->staffRecipients($conversation) as $user) {
            $this->pushInbox(
                $user,
                $conversation->assignee_user_id
                    ? 'Nova conversa encaminhada'
                    : 'Nova conversa na fila',
                $conversation->assignee_user_id
                    ? 'Uma conversa foi encaminhada para você no NS Whats.'
                    : 'Uma conversa foi encaminhada para o seu departamento.',
                $this->staffActionUrl($conversation),
            );
        }
    }

    public function notifyClosed(ChurchConversation $conversation, User $actor): void
    {
        $isMember = (int) $actor->id === (int) $conversation->member_user_id;
        if ($isMember) {
            foreach ($this->staffRecipients($conversation) as $user) {
                if ((int) $user->id === (int) $actor->id) {
                    continue;
                }
                $this->pushInbox(
                    $user,
                    'Conversa finalizada',
                    'O membro finalizou a conversa no NS Whats.',
                    $this->staffActionUrl($conversation),
                );
            }

            return;
        }

        $member = User::query()->find($conversation->member_user_id);
        if ($member && (int) $member->id !== (int) $actor->id) {
            $this->pushInbox(
                $member,
                'Conversa finalizada',
                'Sua conversa no NS Whats foi finalizada.',
                $this->memberActionUrl($conversation),
            );
        }
    }

    public function notifyReopened(ChurchConversation $conversation, User $actor): void
    {
        $isMember = (int) $actor->id === (int) $conversation->member_user_id;
        if ($isMember) {
            $this->notifyStaffOfMemberMessage($conversation, $actor, 'Conversa reaberta pelo membro.');

            return;
        }

        $member = User::query()->find($conversation->member_user_id);
        if ($member && (int) $member->id !== (int) $actor->id) {
            $this->pushInbox(
                $member,
                'Conversa reaberta',
                'Sua conversa no NS Whats foi reaberta.',
                $this->memberActionUrl($conversation),
            );
        }
    }

    /**
     * Destinatários do lado da equipe: responsável, preferido ou líderes do departamento.
     *
     * @return list<User>
     */
    private function staffRecipients(ChurchConversation $conversation): array
    {
        $users = [];
        $seen = [];

        $add = function (?User $user) use (&$users, &$seen): void {
            if (! $user || isset($seen[$user->id])) {
                return;
            }
            $seen[$user->id] = true;
            $users[] = $user;
        };

        if ($conversation->assignee_user_id) {
            $add($conversation->assignee ?? User::query()->find($conversation->assignee_user_id));
        }

        if ($conversation->preferred_leader_user_id) {
            $add($conversation->preferredLeader ?? User::query()->find($conversation->preferred_leader_user_id));
        }

        if ($users !== []) {
            return $users;
        }

        foreach (NsWhatsAccess::leadersForMinistry((int) $conversation->church_id, (int) $conversation->current_ministry_id) as $leader) {
            $add(User::query()->find($leader['id']));
        }

        return $users;
    }

    private function staffActionUrl(ChurchConversation $conversation): string
    {
        // Abre em «Meus NS Whats» (conversas recebidas / assumidas).
        return route('mobile.ns-whats.index', ['conversa' => $conversation->id], absolute: false);
    }

    private function memberActionUrl(ChurchConversation $conversation): string
    {
        return route('mobile.ns-whats.index', ['conversa' => $conversation->id], absolute: false);
    }

    private function pushInbox(User $user, string $title, string $body, string $actionPath): void
    {
        if (! UserMessagingPreferences::acceptsInbox($user)) {
            return;
        }

        $row = UserInboxNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'action_url' => null,
            'read_at' => null,
        ]);

        $absolute = url($actionPath).(str_contains($actionPath, '?') ? '&' : '?').'inbox='.$row->id;
        $row->update(['action_url' => $absolute]);
    }
}
