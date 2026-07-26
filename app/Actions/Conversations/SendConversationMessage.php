<?php

namespace App\Actions\Conversations;

use App\Actions\Conversations\ArchiveConversationForUser;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Services\ConversationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SendConversationMessage
{
    public function __construct(
        private ConversationNotifier $notifier,
        private ArchiveConversationForUser $archiveForUser,
    ) {}

    public function handle(ChurchConversation $conversation, User $actor, string $body, string $kind = ChurchConversationMessage::KIND_PUBLIC): ChurchConversationMessage
    {
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > 5000) {
            throw ValidationException::withMessages([
                'content' => ['Mensagem inválida.'],
            ]);
        }

        $isMember = (int) $conversation->member_user_id === (int) $actor->id;
        $authorRole = $isMember ? 'member' : ($actor->hasAnyRole(['admin', 'super_admin']) ? 'admin' : 'leader');

        $message = DB::transaction(function () use ($conversation, $actor, $body, $kind, $isMember, $authorRole) {
            if ($kind === ChurchConversationMessage::KIND_PUBLIC && ! $isMember && $conversation->assignee_user_id === null) {
                $conversation->assignee_user_id = $actor->id;
                $conversation->save();

                ChurchConversationMessage::create([
                    'conversation_id' => $conversation->id,
                    'author_user_id' => null,
                    'author_role' => 'system',
                    'body' => $actor->name.' assumiu a conversa.',
                    'kind' => ChurchConversationMessage::KIND_SYSTEM,
                ]);

                ChurchConversationEvent::create([
                    'conversation_id' => $conversation->id,
                    'type' => 'claimed',
                    'actor_user_id' => $actor->id,
                    'before' => ['assignee_user_id' => null],
                    'after' => ['assignee_user_id' => $actor->id],
                    'created_at' => now(),
                ]);
            }

            $message = ChurchConversationMessage::create([
                'conversation_id' => $conversation->id,
                'author_user_id' => $actor->id,
                'author_role' => $kind === ChurchConversationMessage::KIND_SYSTEM ? 'system' : $authorRole,
                'body' => $body,
                'kind' => $kind,
            ]);

            if ($kind === ChurchConversationMessage::KIND_PUBLIC) {
                $conversation->last_activity_at = now();
                if ($isMember) {
                    $conversation->status = ChurchConversation::STATUS_AWAITING_DEPARTMENT;
                } else {
                    $conversation->status = ChurchConversation::STATUS_AWAITING_MEMBER;
                }
                $conversation->save();

                ChurchConversationEvent::create([
                    'conversation_id' => $conversation->id,
                    'type' => 'message_sent',
                    'actor_user_id' => $actor->id,
                    'before' => null,
                    'after' => ['message_id' => $message->id, 'kind' => $kind],
                    'created_at' => now(),
                ]);
            } else {
                ChurchConversationEvent::create([
                    'conversation_id' => $conversation->id,
                    'type' => 'internal_note',
                    'actor_user_id' => $actor->id,
                    'before' => null,
                    'after' => ['message_id' => $message->id],
                    'created_at' => now(),
                ]);
            }

            return $message;
        });

        if ($kind === ChurchConversationMessage::KIND_PUBLIC) {
            $fresh = $conversation->fresh(['member', 'assignee', 'preferredLeader', 'currentMinistry']);

            // WhatsApp: mensagem nova desarquiva para quem recebe (não para quem enviou).
            if ($isMember) {
                $recipientIds = array_filter([
                    $fresh->assignee_user_id ? (int) $fresh->assignee_user_id : null,
                    $fresh->preferred_leader_user_id ? (int) $fresh->preferred_leader_user_id : null,
                ]);
                $this->archiveForUser->unarchiveForUsers($fresh, $recipientIds);
            } else {
                $this->archiveForUser->unarchiveForUsers($fresh, [(int) $fresh->member_user_id]);
            }

            try {
                if ($isMember) {
                    // Membro falou → próximo alerta ao membro reinicia quando a equipe responder.
                    $this->notifier->clearMemberAlertThrottle($fresh);
                    $fresh = $fresh->fresh(['member', 'assignee', 'preferredLeader', 'currentMinistry']);
                    $this->notifier->notifyStaffOfMemberMessage($fresh, $actor, $body);
                } else {
                    // Equipe falou → próximo alerta à equipe reinicia quando o membro responder.
                    $this->notifier->clearStaffAlertThrottle($fresh);
                    $fresh = $fresh->fresh(['member', 'assignee', 'preferredLeader', 'currentMinistry']);
                    $this->notifier->notifyMemberOfStaffMessage($fresh, $actor, $body);
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $message;
    }
}
