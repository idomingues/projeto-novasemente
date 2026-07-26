<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationArchive;
use App\Models\ChurchConversationEvent;
use App\Models\User;

class ArchiveConversationForUser
{
    public function archive(ChurchConversation $conversation, User $user): void
    {
        ChurchConversationArchive::query()->updateOrCreate(
            [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
            ],
            ['archived_at' => now()],
        );

        // Compatibilidade com coluna legada do membro.
        if ((int) $conversation->member_user_id === (int) $user->id) {
            $conversation->forceFill(['member_archived_at' => now()])->save();
        }

        ChurchConversationEvent::create([
            'conversation_id' => $conversation->id,
            'type' => 'archived',
            'actor_user_id' => $user->id,
            'before' => null,
            'after' => null,
            'created_at' => now(),
        ]);
    }

    public function unarchive(ChurchConversation $conversation, User $user): void
    {
        ChurchConversationArchive::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->delete();

        if ((int) $conversation->member_user_id === (int) $user->id) {
            $conversation->forceFill(['member_archived_at' => null])->save();
        }

        ChurchConversationEvent::create([
            'conversation_id' => $conversation->id,
            'type' => 'unarchived',
            'actor_user_id' => $user->id,
            'before' => null,
            'after' => null,
            'created_at' => now(),
        ]);
    }

    public function isArchivedFor(ChurchConversation $conversation, User $user): bool
    {
        return ChurchConversationArchive::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->exists();
    }

    /**
     * Como no WhatsApp: mensagem nova desarquiva para quem recebe.
     *
     * @param  list<int>  $recipientUserIds
     */
    public function unarchiveForUsers(ChurchConversation $conversation, array $recipientUserIds): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $recipientUserIds))));
        if ($ids === []) {
            return;
        }

        ChurchConversationArchive::query()
            ->where('conversation_id', $conversation->id)
            ->whereIn('user_id', $ids)
            ->delete();

        if (in_array((int) $conversation->member_user_id, $ids, true)) {
            $conversation->forceFill(['member_archived_at' => null])->save();
        }
    }
}
