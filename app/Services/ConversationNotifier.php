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
    /** Sem resposta do outro lado, nova mensagem só gera alerta após este intervalo. */
    public const MESSAGE_ALERT_COOLDOWN_SECONDS = 3600;

    public function notifyNewConversation(ChurchConversation $conversation): void
    {
        $memberName = $conversation->member?->name ?? 'Membro';
        $ministry = $conversation->currentMinistry?->name ?? 'Departamento';
        $title = 'Nova conversa no NS Conecta';
        $body = "{$memberName} começou a falar com {$ministry}.";

        $notified = false;
        foreach ($this->staffRecipients($conversation) as $user) {
            if ((int) $user->id === (int) $conversation->member_user_id) {
                continue;
            }
            $this->pushInbox($user, $title, $body, $this->staffActionUrl($conversation));
            $notified = true;
        }

        if ($notified) {
            $this->markStaffAlerted($conversation);
        }
    }

    public function notifyStaffOfMemberMessage(ChurchConversation $conversation, User $member, ?string $content = null): void
    {
        if (! $this->shouldAlertStaff($conversation)) {
            return;
        }

        $isNewTurn = $conversation->staff_alerted_at === null;

        $title = 'NS Conecta';
        $preview = $isNewTurn
            ? "{$member->name} começou a falar com você."
            : (
                $content !== null && trim($content) !== ''
                    ? Str::limit($member->name.': '.trim($content), 140)
                    : "{$member->name} enviou uma nova mensagem."
            );

        $notified = false;
        foreach ($this->staffRecipients($conversation) as $user) {
            if ((int) $user->id === (int) $member->id) {
                continue;
            }
            $this->pushInbox($user, $title, $preview, $this->staffActionUrl($conversation));
            $notified = true;
        }

        if ($notified) {
            $this->markStaffAlerted($conversation);
        }
    }

    public function notifyMemberOfStaffMessage(ChurchConversation $conversation, User $staff, string $content): void
    {
        $member = $conversation->member ?? User::query()->find($conversation->member_user_id);
        if (! $member || (int) $member->id === (int) $staff->id) {
            return;
        }

        if (! $this->shouldAlertMember($conversation)) {
            return;
        }

        $isNewTurn = $conversation->member_alerted_at === null;

        $title = 'NS Conecta';
        $body = $isNewTurn
            ? "{$staff->name} começou a falar com você."
            : (
                trim($content) !== ''
                    ? Str::limit($staff->name.': '.trim($content), 140)
                    : "{$staff->name} enviou uma nova mensagem."
            );

        $this->pushInbox($member, $title, $body, $this->memberActionUrl($conversation));
        $this->markMemberAlerted($conversation);
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
            'NS Conecta — responsável atualizado',
            "{$name} está acompanhando sua conversa.",
            $this->memberActionUrl($conversation),
        );
    }

    public function notifyLeaderOfTransfer(ChurchConversation $conversation, User $toLeader): void
    {
        $this->pushInbox(
            $toLeader,
            'Conversa transferida no NS Conecta',
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
                    ? 'Uma conversa foi encaminhada para você no NS Conecta.'
                    : 'Uma conversa foi encaminhada para o seu departamento.',
                $this->staffActionUrl($conversation),
            );
        }
    }

    public function shouldAlertStaff(ChurchConversation $conversation): bool
    {
        $lastAlertedAt = $conversation->staff_alerted_at;
        if ($lastAlertedAt === null) {
            return true;
        }

        return $lastAlertedAt->lte(now()->subSeconds(self::MESSAGE_ALERT_COOLDOWN_SECONDS));
    }

    public function shouldAlertMember(ChurchConversation $conversation): bool
    {
        $lastAlertedAt = $conversation->member_alerted_at;
        if ($lastAlertedAt === null) {
            return true;
        }

        return $lastAlertedAt->lte(now()->subSeconds(self::MESSAGE_ALERT_COOLDOWN_SECONDS));
    }

    private function markStaffAlerted(ChurchConversation $conversation): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasColumn('church_conversations', 'staff_alerted_at')) {
                return;
            }
            $conversation->forceFill(['staff_alerted_at' => now()])->save();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function markMemberAlerted(ChurchConversation $conversation): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasColumn('church_conversations', 'member_alerted_at')) {
                return;
            }
            $conversation->forceFill(['member_alerted_at' => now()])->save();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Próxima mensagem da equipe deve alertar o membro (novo turno). */
    public function clearMemberAlertThrottle(ChurchConversation $conversation): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasColumn('church_conversations', 'member_alerted_at')) {
                return;
            }
            if ($conversation->member_alerted_at !== null) {
                $conversation->forceFill(['member_alerted_at' => null])->save();
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Próxima mensagem do membro deve alertar a equipe (novo turno). */
    public function clearStaffAlertThrottle(ChurchConversation $conversation): void
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasColumn('church_conversations', 'staff_alerted_at')) {
                return;
            }
            if ($conversation->staff_alerted_at !== null) {
                $conversation->forceFill(['staff_alerted_at' => null])->save();
            }
        } catch (\Throwable $e) {
            report($e);
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
