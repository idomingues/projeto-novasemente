<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Services\ConversationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClaimConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    public function handle(ChurchConversation $conversation, User $leader): ChurchConversation
    {
        return DB::transaction(function () use ($conversation, $leader) {
            $locked = ChurchConversation::query()
                ->whereKey($conversation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->assignee_user_id !== null) {
                if ((int) $locked->assignee_user_id === (int) $leader->id) {
                    return $locked;
                }
                throw ValidationException::withMessages([
                    'conversation' => ['Esta conversa já foi assumida por outro responsável.'],
                ]);
            }

            $before = ['assignee_user_id' => null, 'status' => $locked->status];
            $locked->assignee_user_id = $leader->id;
            $locked->status = ChurchConversation::STATUS_IN_SERVICE;
            $locked->last_activity_at = now();
            $locked->save();

            ChurchConversationMessage::create([
                'conversation_id' => $locked->id,
                'author_user_id' => null,
                'author_role' => 'system',
                'body' => $leader->name.' assumiu a conversa.',
                'kind' => ChurchConversationMessage::KIND_SYSTEM,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $locked->id,
                'type' => 'claimed',
                'actor_user_id' => $leader->id,
                'before' => $before,
                'after' => ['assignee_user_id' => $leader->id, 'status' => $locked->status],
                'created_at' => now(),
            ]);

            $this->notifier->notifyMemberOfAssigneeChange($locked->fresh(['member', 'assignee', 'currentMinistry']));

            return $locked;
        });
    }
}
