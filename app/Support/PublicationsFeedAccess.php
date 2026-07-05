<?php

namespace App\Support;

use App\Models\User;

final class PublicationsFeedAccess
{
    public static function canAccess(?User $user): bool
    {
        if (! config('publications_feed.preview_only', true)) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        $email = strtolower(trim((string) ($user->email ?? '')));
        if ($email === '') {
            return false;
        }

        /** @var list<string> $allowed */
        $allowed = config('publications_feed.preview_emails', []);

        return in_array($email, $allowed, true);
    }

    public static function assertCanAccess(?User $user): void
    {
        if (! self::canAccess($user)) {
            abort(404);
        }
    }
}
