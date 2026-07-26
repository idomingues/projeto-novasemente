<?php

namespace App\Actions\Conversations;

use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\Ministry;
use App\Models\User;
use App\Services\ConversationNotifier;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateConversation
{
    public function __construct(private ConversationNotifier $notifier) {}

    /**
     * @param  array{ministry_id: int, leader_user_id?: int|null, recipient_user_id?: int|null, message: string}  $data
     */
    public function handle(User $member, int $churchId, array $data): ChurchConversation
    {
        $ministry = Ministry::query()
            ->where('church_id', $churchId)
            ->whereKey((int) $data['ministry_id'])
            ->firstOrFail();

        $recipientUserId = $data['recipient_user_id'] ?? $data['leader_user_id'] ?? null;
        $recipientUserId = ($recipientUserId !== null && $recipientUserId !== '')
            ? (int) $recipientUserId
            : null;

        if ($recipientUserId !== null) {
            if (! NsWhatsAccess::isValidRecipient($recipientUserId, $churchId, (int) $ministry->id, $member)) {
                throw ValidationException::withMessages([
                    'recipient_user_id' => ['Escolha um líder ou membro válido deste departamento.'],
                ]);
            }
        }

        $message = trim((string) $data['message']);
        if (mb_strlen($message) < 3) {
            throw ValidationException::withMessages([
                'message' => ['Escreva uma mensagem com pelo menos 3 caracteres.'],
            ]);
        }

        $subject = Str::limit(preg_replace('/\s+/u', ' ', $message) ?? $message, 80, '…');

        $conversation = DB::transaction(function () use ($member, $churchId, $ministry, $recipientUserId, $message, $subject) {
            $conversation = ChurchConversation::create([
                'church_id' => $churchId,
                'member_user_id' => $member->id,
                'subject' => $subject,
                'initial_ministry_id' => $ministry->id,
                'current_ministry_id' => $ministry->id,
                'preferred_leader_user_id' => $recipientUserId,
                'assignee_user_id' => $recipientUserId,
                'status' => $recipientUserId
                    ? ChurchConversation::STATUS_AWAITING_DEPARTMENT
                    : ChurchConversation::STATUS_NEW,
                'last_activity_at' => now(),
                'involves_minor' => NsWhatsAccess::involvesMinor($member),
            ]);

            ChurchConversationMessage::create([
                'conversation_id' => $conversation->id,
                'author_user_id' => $member->id,
                'author_role' => 'member',
                'body' => $message,
                'kind' => ChurchConversationMessage::KIND_PUBLIC,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $conversation->id,
                'type' => 'created',
                'actor_user_id' => $member->id,
                'before' => null,
                'after' => [
                    'ministry_id' => (int) $ministry->id,
                    'preferred_leader_user_id' => $recipientUserId,
                    'assignee_user_id' => $recipientUserId,
                ],
                'created_at' => now(),
            ]);

            return $conversation->fresh();
        });

        $this->notifier->notifyNewConversation($conversation->fresh([
            'member', 'currentMinistry', 'assignee', 'preferredLeader',
        ]));

        return $conversation->fresh();
    }

    public function handleFallback(User $member, int $churchId, string $message): ChurchConversation
    {
        $church = Church::query()->findOrFail($churchId);
        $ministryId = $church->conversation_fallback_ministry_id;
        if (! $ministryId) {
            throw ValidationException::withMessages([
                'ministry_id' => ['A igreja ainda não configurou o departamento para «Não sei com quem falar».'],
            ]);
        }

        return $this->handle($member, $churchId, [
            'ministry_id' => (int) $ministryId,
            'leader_user_id' => null,
            'message' => $message,
        ]);
    }
}
