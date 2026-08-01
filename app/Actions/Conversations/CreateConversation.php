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
        if (mb_strlen($message) < 1) {
            throw ValidationException::withMessages([
                'message' => ['Escreva uma mensagem.'],
            ]);
        }

        $subject = Str::limit(preg_replace('/\s+/u', ' ', $message) ?? $message, 80, '…');

        $wasExisting = false;

        $conversation = DB::transaction(function () use ($member, $churchId, $ministry, $recipientUserId, $message, $subject, &$wasExisting) {
            $existing = null;
            if ($recipientUserId !== null) {
                // Uma conversa por destinatário (qualquer departamento) — evita “nova” cair em thread errada
                // ou criar duplicata quando a pessoa serve em vários departamentos.
                $existing = ChurchConversation::query()
                    ->where('church_id', $churchId)
                    ->where('member_user_id', $member->id)
                    ->where(function ($q) use ($recipientUserId) {
                        $q->where('assignee_user_id', $recipientUserId)
                            ->orWhere('preferred_leader_user_id', $recipientUserId);
                    })
                    ->orderByRaw('CASE WHEN current_ministry_id = ? THEN 0 ELSE 1 END', [(int) $ministry->id])
                    ->orderByDesc('last_activity_at')
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->first();
            }

            $wasExisting = $existing !== null;

            if ($existing) {
                $conversation = $existing;
                $conversation->update([
                    'subject' => $subject,
                    'current_ministry_id' => $ministry->id,
                    'preferred_leader_user_id' => $recipientUserId,
                    'assignee_user_id' => $recipientUserId,
                    'status' => ChurchConversation::STATUS_AWAITING_DEPARTMENT,
                    'last_activity_at' => now(),
                    'member_archived_at' => null,
                ]);
            } else {
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
            }

            ChurchConversationMessage::create([
                'conversation_id' => $conversation->id,
                'author_user_id' => $member->id,
                'author_role' => 'member',
                'body' => $message,
                'kind' => ChurchConversationMessage::KIND_PUBLIC,
            ]);

            ChurchConversationEvent::create([
                'conversation_id' => $conversation->id,
                'type' => $existing ? 'message_on_seeded_thread' : 'created',
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

        $fresh = $conversation->fresh([
            'member', 'currentMinistry', 'assignee', 'preferredLeader',
        ]);

        if ($wasExisting) {
            $this->notifier->clearMemberAlertThrottle($fresh);
            $fresh = $fresh->fresh(['member', 'currentMinistry', 'assignee', 'preferredLeader']);
            $this->notifier->notifyStaffOfMemberMessage($fresh, $member, $message);
        } else {
            $this->notifier->notifyNewConversation($fresh);
        }

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
