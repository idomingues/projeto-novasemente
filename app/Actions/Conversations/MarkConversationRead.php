<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\ChurchConversationRead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class MarkConversationRead
{
    public function handle(ChurchConversation $conversation, User $user, ?int $lastMessageId = null): void
    {
        $lastId = $lastMessageId;
        if ($lastId === null) {
            $lastId = ChurchConversationMessage::query()
                ->where('conversation_id', $conversation->id)
                ->when(
                    (int) $conversation->member_user_id === (int) $user->id,
                    fn ($q) => $q->where('kind', '!=', ChurchConversationMessage::KIND_INTERNAL)
                )
                ->orderByDesc('id')
                ->value('id');
        }

        ChurchConversationRead::query()->updateOrCreate(
            [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
            ],
            [
                'last_read_message_id' => $lastId,
                'read_at' => now(),
            ]
        );
    }
}
