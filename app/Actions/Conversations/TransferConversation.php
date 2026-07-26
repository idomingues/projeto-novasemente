<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\ChurchConversationTransfer;
use App\Models\User;
use App\Services\ConversationNotifier;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransferConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    public function handle(ChurchConversation $conversation, User $actor, int $toUserId, ?string $reason = null): ChurchConversation
    {
        $toUser = User::query()->findOrFail($toUserId);
        if ((int) $toUser->id === (int) $actor->id) {
            throw ValidationException::withMessages([
                'to_user_id' => ['Escolha outro líder.'],
            ]);
        }

        if (! NsWhatsAccess::leadsMinistry($toUser, (int) $conversation->current_ministry_id)
            && ! NsWhatsAccess::isModuleAdmin($toUser)) {
            throw ValidationException::withMessages([
                'to_user_id' => ['O destinatário precisa ser líder deste departamento.'],
            ]);
        }

        return DB::transaction(function () use ($conversation, $actor, $toUser, $reason) {
            $locked = ChurchConversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();
            $fromId = $locked->assignee_user_id;

            $locked->assignee_user_id = $toUser->id;
            $locked->preferred_leader_user_id = $toUser->id;
            $locked->status = ChurchConversation::STATUS_IN_SERVICE;
            $locked->last_activity_at = now();
            $locked->save();

            ChurchConversationTransfer::create([
                'conversation_id' => $locked->id,
                'from_user_id' => $fromId,
                'to_user_id' => $toUser->id,
                'reason' => $reason,
                'transferred_by_user_id' => $actor->id,
                'created_at' => now(),
            ]);

            $fromName = $fromId ? (User::query()->find($fromId)?->name ?? 'Responsável anterior') : 'Fila do departamento';
            ChurchConversationMessage::create([
                'conversation_id' => $locked->id,
                'author_user_id' => null,
                'author_role' => 'system',
                'body' => "A conversa foi transferida de {$fromName} para {$toUser->name}.",
                'kind' => ChurchConversationMessage::KIND_SYSTEM,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $locked->id,
                'type' => 'transferred',
                'actor_user_id' => $actor->id,
                'before' => ['assignee_user_id' => $fromId],
                'after' => ['assignee_user_id' => $toUser->id, 'reason' => $reason],
                'created_at' => now(),
            ]);

            $fresh = $locked->fresh(['member', 'assignee', 'currentMinistry']);
            $this->notifier->notifyMemberOfAssigneeChange($fresh);
            $this->notifier->notifyLeaderOfTransfer($fresh, $toUser);

            return $fresh;
        });
    }
}
