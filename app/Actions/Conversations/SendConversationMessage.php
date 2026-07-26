<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Services\ConversationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SendConversationMessage
{
    public function __construct(private ConversationNotifier $notifier) {}

    public function handle(ChurchConversation $conversation, User $actor, string $body, string $kind = ChurchConversationMessage::KIND_PUBLIC): ChurchConversationMessage
    {
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > 5000) {
            throw ValidationException::withMessages([
                'content' => ['Mensagem inválida.'],
            ]);
        }

        if (! $conversation->allowsChat() && $kind !== ChurchConversationMessage::KIND_INTERNAL) {
            throw ValidationException::withMessages([
                'content' => ['Esta conversa foi finalizada.'],
            ]);
        }

        $isMember = (int) $conversation->member_user_id === (int) $actor->id;
        $authorRole = $isMember ? 'member' : ($actor->hasAnyRole(['admin', 'super_admin']) ? 'admin' : 'leader');

        $message = DB::transaction(function () use ($conversation, $actor, $body, $kind, $isMember, $authorRole) {
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
                    if ($conversation->assignee_user_id === null) {
                        $conversation->assignee_user_id = $actor->id;
                    }
                    if ($conversation->status === ChurchConversation::STATUS_NEW
                        || $conversation->getOriginal('status') === ChurchConversation::STATUS_NEW) {
                        $conversation->status = ChurchConversation::STATUS_AWAITING_MEMBER;
                    }
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
            if ($isMember) {
                $this->notifier->notifyStaffOfMemberMessage($fresh, $actor, $body);
            } else {
                $this->notifier->notifyMemberOfStaffMessage($fresh, $actor, $body);
            }
        }

        return $message;
    }
}
