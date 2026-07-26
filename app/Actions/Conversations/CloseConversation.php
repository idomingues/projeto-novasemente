<?php

namespace App\Actions\Conversations;

use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\User;
use App\Services\ConversationNotifier;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    public function handle(ChurchConversation $conversation, User $actor, string $role): ChurchConversation
    {
        if (! $conversation->allowsChat()) {
            return $conversation;
        }

        return DB::transaction(function () use ($conversation, $actor, $role) {
            $locked = ChurchConversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();
            $church = Church::query()->find($locked->church_id);
            $closedAt = now();

            $locked->status = ChurchConversation::STATUS_CLOSED;
            $locked->closed_at = $closedAt;
            $locked->closed_by_user_id = $actor->id;
            $locked->closed_by_role = $role;
            $locked->reopen_until = NsWhatsAccess::reopenUntilFrom($closedAt, $church);
            $locked->last_activity_at = $closedAt;
            $locked->save();

            $when = $closedAt->timezone(config('app.timezone'))->format('d/m/Y \à\s H\hi');
            ChurchConversationMessage::create([
                'conversation_id' => $locked->id,
                'author_user_id' => null,
                'author_role' => 'system',
                'body' => "Conversa finalizada por {$actor->name} em {$when}.",
                'kind' => ChurchConversationMessage::KIND_SYSTEM,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $locked->id,
                'type' => 'closed',
                'actor_user_id' => $actor->id,
                'before' => null,
                'after' => ['closed_by_role' => $role, 'reopen_until' => $locked->reopen_until?->toIso8601String()],
                'created_at' => now(),
            ]);

            $fresh = $locked->fresh(['member', 'assignee', 'currentMinistry']);
            $this->notifier->notifyClosed($fresh, $actor);

            return $fresh;
        });
    }
}
