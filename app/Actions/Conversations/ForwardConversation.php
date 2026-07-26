<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationForward;
use App\Models\ChurchConversationMessage;
use App\Models\Ministry;
use App\Models\User;
use App\Services\ConversationNotifier;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ForwardConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    /**
     * @param  array{to_ministry_id: int, to_leader_user_id?: int|null, reason?: string|null, internal_note?: string|null}  $data
     */
    public function handle(ChurchConversation $conversation, User $actor, array $data): ChurchConversation
    {
        $toMinistry = Ministry::query()
            ->where('church_id', $conversation->church_id)
            ->whereKey((int) $data['to_ministry_id'])
            ->firstOrFail();

        if ((int) $toMinistry->id === (int) $conversation->current_ministry_id) {
            throw ValidationException::withMessages([
                'to_ministry_id' => ['Escolha outro departamento.'],
            ]);
        }

        $toLeaderId = isset($data['to_leader_user_id']) && $data['to_leader_user_id']
            ? (int) $data['to_leader_user_id']
            : null;

        if ($toLeaderId) {
            $ok = collect(NsWhatsAccess::leadersForMinistry((int) $conversation->church_id, (int) $toMinistry->id))
                ->contains(fn (array $l) => (int) $l['id'] === $toLeaderId);
            if (! $ok) {
                throw ValidationException::withMessages([
                    'to_leader_user_id' => ['Líder inválido para o departamento de destino.'],
                ]);
            }
        }

        return DB::transaction(function () use ($conversation, $actor, $toMinistry, $toLeaderId, $data) {
            $locked = ChurchConversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();
            $fromMinistryId = (int) $locked->current_ministry_id;
            $fromMinistryName = $locked->currentMinistry?->name
                ?? Ministry::query()->whereKey($fromMinistryId)->value('name')
                ?? 'Departamento';

            $locked->current_ministry_id = $toMinistry->id;
            $locked->preferred_leader_user_id = $toLeaderId;
            $locked->assignee_user_id = $toLeaderId;
            $locked->status = $toLeaderId
                ? ChurchConversation::STATUS_AWAITING_DEPARTMENT
                : ChurchConversation::STATUS_FORWARDED;
            $locked->last_activity_at = now();
            $locked->save();

            ChurchConversationForward::create([
                'conversation_id' => $locked->id,
                'from_ministry_id' => $fromMinistryId,
                'to_ministry_id' => $toMinistry->id,
                'to_leader_user_id' => $toLeaderId,
                'reason' => $data['reason'] ?? null,
                'internal_note' => $data['internal_note'] ?? null,
                'forwarded_by_user_id' => $actor->id,
                'created_at' => now(),
            ]);

            ChurchConversationMessage::create([
                'conversation_id' => $locked->id,
                'author_user_id' => null,
                'author_role' => 'system',
                'body' => "Sua conversa foi encaminhada de {$fromMinistryName} para {$toMinistry->name}.",
                'kind' => ChurchConversationMessage::KIND_SYSTEM,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $locked->id,
                'type' => 'forwarded',
                'actor_user_id' => $actor->id,
                'before' => ['ministry_id' => $fromMinistryId],
                'after' => [
                    'ministry_id' => (int) $toMinistry->id,
                    'to_leader_user_id' => $toLeaderId,
                    'reason' => $data['reason'] ?? null,
                ],
                'created_at' => now(),
            ]);

            $fresh = $locked->fresh(['member', 'assignee', 'currentMinistry', 'preferredLeader']);
            $this->notifier->notifyMemberOfForward($fresh, $fromMinistryName, (string) $toMinistry->name);
            $this->notifier->notifyDepartmentOfForward($fresh);

            return $fresh;
        });
    }
}
