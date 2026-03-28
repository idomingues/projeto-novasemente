<?php

namespace App\Support;

use App\Models\UserInboxNotification;
use Illuminate\Http\Request;

class InboxNotificationResolver
{
    /** Marca como lida a notificação de inbox referenciada em `?inbox=` (URL aberta a partir do aviso). */
    public static function markReadFromQuery(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            return;
        }

        $inbox = $request->query('inbox');
        if (! is_string($inbox) || $inbox === '' || ! ctype_digit($inbox)) {
            return;
        }

        $n = UserInboxNotification::query()
            ->where('id', (int) $inbox)
            ->where('user_id', $user->id)
            ->first();

        if ($n) {
            $n->update(['read_at' => now()]);
        }
    }
}
