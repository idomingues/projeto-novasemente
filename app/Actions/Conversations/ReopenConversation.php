<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Services\ConversationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReopenConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    public function handle(ChurchConversation $conversation, User $actor): ChurchConversation
    {
        if (! $conversation->canReopen()) {
            throw ValidationException::withMessages([
                'conversation' => ['O prazo para reabrir esta conversa encerrou. Inicie uma nova conversa.'],
            ]);
        }

        return DB::transaction(function () use ($conversation, $actor) {
            $locked = ChurchConversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();

            $locked->status = $locked->assignee_user_id
                ? ChurchConversation::STATUS_AWAITING_DEPARTMENT
                : ChurchConversation::STATUS_NEW;
            $locked->closed_at = null;
            $locked->closed_by_user_id = null;
            $locked->closed_by_role = null;
            $locked->reopen_until = null;
            $locked->last_activity_at = now();
            $locked->save();

            ChurchConversationMessage::create([
                'conversation_id' => $locked->id,
                'author_user_id' => null,
                'author_role' => 'system',
                'body' => "Conversa reaberta por {$actor->name}.",
                'kind' => ChurchConversationMessage::KIND_SYSTEM,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $locked->id,
                'type' => 'reopened',
                'actor_user_id' => $actor->id,
                'before' => null,
                'after' => ['status' => $locked->status],
                'created_at' => now(),
            ]);

            $fresh = $locked->fresh(['member', 'assignee', 'currentMinistry']);
            $this->notifier->notifyReopened($fresh, $actor);

            return $fresh;
        });
    }
}
