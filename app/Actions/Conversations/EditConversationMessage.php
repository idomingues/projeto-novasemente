<?php

namespace App\Actions\Conversations;

use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\ChurchConversationMessageVersion;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EditConversationMessage
{
    public function handle(ChurchConversationMessage $message, User $actor, string $body): ChurchConversationMessage
    {
        $body = trim($body);
        if (mb_strlen($body) < 1 || mb_strlen($body) > 5000) {
            throw ValidationException::withMessages([
                'content' => ['Mensagem inválida.'],
            ]);
        }

        return DB::transaction(function () use ($message, $actor, $body) {
            $previous = $message->body;
            ChurchConversationMessageVersion::create([
                'message_id' => $message->id,
                'previous_body' => $previous,
                'changed_by_user_id' => $actor->id,
                'created_at' => now(),
            ]);

            $message->body = $body;
            $message->edited_at = now();
            $message->save();

            ChurchConversationEvent::create([
                'conversation_id' => $message->conversation_id,
                'type' => 'message_edited',
                'actor_user_id' => $actor->id,
                'before' => ['message_id' => $message->id, 'body' => $previous],
                'after' => ['message_id' => $message->id, 'body' => $body],
                'created_at' => now(),
            ]);

            return $message->fresh();
        });
    }
}
