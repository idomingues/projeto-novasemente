<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use App\Models\User;

final class MissionVolunteerAccountResolver
{
    public static function userForVolunteer(MissionVolunteer $volunteer): ?User
    {
        $email = self::normalizeEmail($volunteer->display_email);
        if ($email !== null) {
            $byEmail = User::query()
                ->where('church_id', $volunteer->church_id)
                ->whereRaw('LOWER(email) = ?', [$email])
                ->first();
            if ($byEmail) {
                return $byEmail;
            }
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone((string) $volunteer->phone);
        if ($phoneNorm === null) {
            return null;
        }

        $users = User::query()
            ->where('church_id', $volunteer->church_id)
            ->get(['id', 'email', 'phone', 'notify_via_app', 'notify_via_email']);

        foreach ($users as $user) {
            if (VolunteerContactDuplicateChecker::normalizePhone($user->phone) === $phoneNorm) {
                return $user;
            }
        }

        return null;
    }

    public static function emailForVolunteer(MissionVolunteer $volunteer, ?User $user = null): ?string
    {
        $user ??= self::userForVolunteer($volunteer);

        $email = self::normalizeEmail($user?->email) ?? self::normalizeEmail($volunteer->display_email);

        return $email;
    }

    private static function normalizeEmail(?string $email): ?string
    {
        $normalized = VolunteerContactDuplicateChecker::normalizeEmail($email);

        return $normalized;
    }
}
