<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;

/**
 * Garante uma conversa aberta com cada líder dos departamentos em que o usuário serve,
 * mesmo sem mensagens — para o líder aparecer na lista do NS Whats.
 */
class EnsureMemberServedLeaderThreads
{
    public function handle(User $member, int $churchId): void
    {
        if ($churchId < 1) {
            return;
        }

        $ministryIds = Volunteer::query()
            ->where('user_id', $member->id)
            ->where('active', true)
            ->whereHas('ministries', fn ($q) => $q->where('ministries.church_id', $churchId))
            ->with(['ministries:id'])
            ->get()
            ->flatMap(fn (Volunteer $v) => $v->ministries->pluck('id'))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($ministryIds === []) {
            return;
        }

        foreach ($ministryIds as $ministryId) {
            $leaders = NsWhatsAccess::leadersForMinistry($churchId, $ministryId, $member);
            foreach ($leaders as $leader) {
                $leaderId = (int) $leader['id'];
                if ($leaderId < 1 || $leaderId === (int) $member->id) {
                    continue;
                }

                $this->ensureOpenThread($member, $churchId, $ministryId, $leaderId, (string) $leader['name']);
            }
        }
    }

    private function ensureOpenThread(
        User $member,
        int $churchId,
        int $ministryId,
        int $leaderId,
        string $leaderName,
    ): void {
        $exists = ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where('member_user_id', $member->id)
            ->where('current_ministry_id', $ministryId)
            ->where('status', '!=', ChurchConversation::STATUS_CLOSED)
            ->where(function ($q) use ($leaderId) {
                $q->where('assignee_user_id', $leaderId)
                    ->orWhere('preferred_leader_user_id', $leaderId);
            })
            ->exists();

        if ($exists) {
            return;
        }

        DB::transaction(function () use ($member, $churchId, $ministryId, $leaderId, $leaderName) {
            $conversation = ChurchConversation::query()->create([
                'church_id' => $churchId,
                'member_user_id' => $member->id,
                'subject' => $leaderName,
                'initial_ministry_id' => $ministryId,
                'current_ministry_id' => $ministryId,
                'preferred_leader_user_id' => $leaderId,
                'assignee_user_id' => $leaderId,
                'status' => ChurchConversation::STATUS_IN_SERVICE,
                'last_activity_at' => now(),
                'involves_minor' => NsWhatsAccess::involvesMinor($member),
            ]);

            ChurchConversationEvent::query()->create([
                'conversation_id' => $conversation->id,
                'type' => 'seeded_leader_thread',
                'actor_user_id' => $member->id,
                'before' => null,
                'after' => [
                    'ministry_id' => $ministryId,
                    'preferred_leader_user_id' => $leaderId,
                    'assignee_user_id' => $leaderId,
                ],
                'created_at' => now(),
            ]);
        });
    }
}
