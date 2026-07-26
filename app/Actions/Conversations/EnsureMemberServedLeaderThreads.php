<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationArchive;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\ChurchConversationRead;
use App\Models\User;
use App\Models\Volunteer;
use App\Support\NsWhatsAccess;
use Illuminate\Support\Facades\DB;

/**
 * Garante uma conversa aberta com cada líder dos departamentos em que o usuário serve,
 * mesmo sem mensagens — para o líder aparecer na lista do NS Conecta.
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
        DB::transaction(function () use ($member, $churchId, $ministryId, $leaderId, $leaderName) {
            $existing = $this->leaderThreadsQuery($member->id, $churchId, $ministryId, $leaderId)
                ->lockForUpdate()
                ->orderByDesc('last_activity_at')
                ->orderByDesc('id')
                ->get();

            if ($existing->isNotEmpty()) {
                $this->mergeDuplicates($existing);

                return;
            }

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

    /**
     * @return \Illuminate\Database\Eloquent\Builder<ChurchConversation>
     */
    private function leaderThreadsQuery(int $memberId, int $churchId, int $ministryId, int $leaderId)
    {
        return ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where('member_user_id', $memberId)
            ->where('current_ministry_id', $ministryId)
            ->where(function ($q) use ($leaderId) {
                $q->where('assignee_user_id', $leaderId)
                    ->orWhere('preferred_leader_user_id', $leaderId);
            });
    }

    /**
     * Mantém a conversa mais recente e move mensagens/leituras das demais.
     *
     * @param  \Illuminate\Support\Collection<int, ChurchConversation>  $threads
     */
    private function mergeDuplicates($threads): void
    {
        if ($threads->count() <= 1) {
            return;
        }

        /** @var ChurchConversation $keep */
        $keep = $threads->first();
        foreach ($threads->skip(1) as $duplicate) {
            ChurchConversationMessage::query()
                ->where('conversation_id', $duplicate->id)
                ->update(['conversation_id' => $keep->id]);

            ChurchConversationEvent::query()
                ->where('conversation_id', $duplicate->id)
                ->update(['conversation_id' => $keep->id]);

            ChurchConversationRead::query()
                ->where('conversation_id', $duplicate->id)
                ->each(function (ChurchConversationRead $read) use ($keep) {
                    $existing = ChurchConversationRead::query()
                        ->where('conversation_id', $keep->id)
                        ->where('user_id', $read->user_id)
                        ->first();
                    if ($existing) {
                        if (($read->last_read_message_id ?? 0) > ($existing->last_read_message_id ?? 0)) {
                            $existing->update([
                                'last_read_message_id' => $read->last_read_message_id,
                                'read_at' => $read->read_at,
                            ]);
                        }
                        $read->delete();
                    } else {
                        $read->update(['conversation_id' => $keep->id]);
                    }
                });

            if (class_exists(ChurchConversationArchive::class)) {
                ChurchConversationArchive::query()
                    ->where('conversation_id', $duplicate->id)
                    ->each(function (ChurchConversationArchive $archive) use ($keep) {
                        $exists = ChurchConversationArchive::query()
                            ->where('conversation_id', $keep->id)
                            ->where('user_id', $archive->user_id)
                            ->exists();
                        if ($exists) {
                            $archive->delete();
                        } else {
                            $archive->update(['conversation_id' => $keep->id]);
                        }
                    });
            }

            $duplicate->delete();
        }

        $keep->forceFill([
            'last_activity_at' => $keep->messages()->max('created_at') ?: $keep->last_activity_at ?: now(),
        ])->save();
    }
}
