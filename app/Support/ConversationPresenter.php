<?php

namespace App\Support;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationMessage;
use App\Models\ChurchConversationRead;
use App\Models\User;
use App\Policies\ChurchConversationPolicy;

final class ConversationPresenter
{
    /**
     * Nome do departamento para UI do NS Conecta: remove sufixo de status do voluntário
     * (ex.: «Coral - atuante» → «Coral»).
     */
    public static function displayMinistryName(?string $name): string
    {
        $name = trim((string) $name);
        if ($name === '') {
            return '';
        }

        $suffixes = [
            'atuante',
            'ativo',
            'interessados',
            'interessado',
            'em treinamento',
            'treinamento',
            'em análise',
            'em analise',
            'pronto para servir',
            'novo',
            'recusado pelo líder',
            'recusado pelo lider',
        ];

        foreach ($suffixes as $suffix) {
            $pattern = '/^(.*?)\s*[-–—]\s*'.preg_quote($suffix, '/').'$/iu';
            if (preg_match($pattern, $name, $matches) === 1) {
                $base = trim((string) ($matches[1] ?? ''));
                if ($base !== '') {
                    return $base;
                }
            }
        }

        return $name;
    }

    /**
     * @return array<string, mixed>
     */
    public static function forMember(ChurchConversation $c, User $viewer): array
    {
        $c->loadMissing([
            'currentMinistry:id,name,icon',
            'assignee:id,name,photo_url',
            'preferredLeader:id,name,photo_url',
            'messages.author:id,name',
        ]);

        $messages = $c->messages
            ->filter(fn (ChurchConversationMessage $m) => $m->kind !== ChurchConversationMessage::KIND_INTERNAL)
            ->filter(fn (ChurchConversationMessage $m) => $m->member_hidden_at === null)
            ->values()
            ->map(fn (ChurchConversationMessage $m) => self::messageRow($m, false))
            ->all();

        $unread = self::unreadCount($c, $viewer, true);
        $ministryName = self::displayMinistryName($c->currentMinistry?->name);
        $ministryId = (int) ($c->current_ministry_id ?? 0);
        $assignee = $c->assignee;
        if ($assignee !== null && $ministryId > 0 && NsWhatsAccess::leadsMinistry($assignee, $ministryId)) {
            $headerSubtitle = $ministryName !== '' ? 'Líder - '.$ministryName : 'Líder';
        } elseif ($assignee !== null) {
            $headerSubtitle = $ministryName !== '' ? 'Voluntário - '.$ministryName : 'Voluntário';
        } else {
            $headerSubtitle = $ministryName !== '' ? $ministryName : 'Aguardando um líder assumir';
        }

        return [
            'id' => $c->id,
            'subject' => $c->subject,
            'status' => $c->status,
            'statusLabel' => ChurchConversation::memberStatusLabel($c->status),
            'ministryName' => $ministryName !== '' ? $ministryName : null,
            'ministryIcon' => $c->currentMinistry?->icon,
            'assigneeName' => $c->assignee?->name,
            'preferredLeaderName' => $c->preferredLeader?->name,
            'canChat' => true,
            'archived' => app(\App\Actions\Conversations\ArchiveConversationForUser::class)->isArchivedFor($c, $viewer),
            'memberArchived' => $c->member_archived_at !== null,
            'lastActivityAt' => $c->last_activity_at?->toIso8601String(),
            'createdAt' => $c->created_at?->toIso8601String(),
            'closedAt' => $c->closed_at?->toIso8601String(),
            'unreadCount' => $unread,
            'lastPreview' => self::lastPreview($messages),
            'messages' => $messages,
            'headerTitle' => $c->assignee?->name ?? ($ministryName !== '' ? $ministryName : 'NS Conecta'),
            'headerSubtitle' => $headerSubtitle,
            'headerPhotoUrl' => $c->assignee?->photo_url,
            'currentMinistryId' => $c->current_ministry_id ? (int) $c->current_ministry_id : null,
            'counterpartUserId' => $c->assignee_user_id
                ? (int) $c->assignee_user_id
                : ($c->preferred_leader_user_id ? (int) $c->preferred_leader_user_id : null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function forLeader(ChurchConversation $c, User $viewer): array
    {
        $base = self::forMember($c, $viewer);
        $c->loadMissing(['member:id,name,photo_url', 'messages.author:id,name']);

        $messages = $c->messages
            ->values()
            ->map(fn (ChurchConversationMessage $m) => self::messageRow($m, true))
            ->all();

        $policy = app(ChurchConversationPolicy::class);
        $ministryName = self::displayMinistryName($c->currentMinistry?->name);
        $headerSubtitle = $ministryName !== '' ? 'Voluntário - '.$ministryName : 'Voluntário';

        return array_merge($base, [
            'statusLabel' => ChurchConversation::staffStatusLabel($c->status),
            'memberName' => $c->member?->name,
            'memberId' => $c->member_user_id,
            'assigneeUserId' => $c->assignee_user_id,
            'preferredLeaderUserId' => $c->preferred_leader_user_id,
            'currentMinistryId' => $c->current_ministry_id,
            'directedToMe' => $c->preferred_leader_user_id !== null
                && (int) $c->preferred_leader_user_id === (int) $viewer->id,
            'messages' => $messages,
            'canClaim' => $policy->claim($viewer, $c),
            'canTransfer' => $policy->transfer($viewer, $c),
            'canForward' => $policy->forward($viewer, $c),
            'canInternalNote' => $policy->addInternalNote($viewer, $c),
            'canReply' => $policy->sendMessage($viewer, $c),
            'canChat' => $policy->sendMessage($viewer, $c),
            'headerTitle' => $c->member?->name ?? 'Membro',
            'headerSubtitle' => $headerSubtitle,
            'ministryName' => $ministryName !== '' ? $ministryName : null,
            'headerPhotoUrl' => $c->member?->photo_url,
            'unreadCount' => self::unreadCount($c, $viewer, false),
            'currentMinistryId' => $c->current_ministry_id ? (int) $c->current_ministry_id : null,
            'counterpartUserId' => $c->member_user_id ? (int) $c->member_user_id : null,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     */
    private static function lastPreview(array $messages): string
    {
        if ($messages === []) {
            return 'Toque para conversar';
        }
        $last = $messages[count($messages) - 1];

        return (string) ($last['body'] ?? 'Nova conversa');
    }

    /**
     * @return array<string, mixed>
     */
    public static function messagePayload(ChurchConversationMessage $m, bool $includeInternal = false): array
    {
        $m->loadMissing('author:id,name');

        return self::messageRow($m, $includeInternal);
    }

    /**
     * @return array<string, mixed>
     */
    private static function messageRow(ChurchConversationMessage $m, bool $includeInternal): array
    {
        return [
            'id' => $m->id,
            'authorUserId' => $m->author_user_id,
            'authorRole' => $m->author_role,
            'authorName' => $m->author?->name,
            'body' => $m->body,
            'kind' => $m->kind,
            'editedAt' => $m->edited_at?->toIso8601String(),
            'createdAt' => $m->created_at?->toIso8601String(),
            'isInternal' => $m->kind === ChurchConversationMessage::KIND_INTERNAL,
            'isSystem' => $m->kind === ChurchConversationMessage::KIND_SYSTEM,
        ];
    }

    private static function unreadCount(ChurchConversation $c, User $viewer, bool $memberView): int
    {
        $read = ChurchConversationRead::query()
            ->where('conversation_id', $c->id)
            ->where('user_id', $viewer->id)
            ->first();

        $q = ChurchConversationMessage::query()->where('conversation_id', $c->id);
        if ($memberView) {
            $q->where('kind', '!=', ChurchConversationMessage::KIND_INTERNAL)
                ->whereNull('member_hidden_at');
        }
        if ($read?->last_read_message_id) {
            $q->where('id', '>', $read->last_read_message_id);
        }

        return (int) $q->count();
    }
}
