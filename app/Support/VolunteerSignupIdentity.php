<?php

namespace App\Support;

use App\Models\User;
use App\Models\Volunteer;

/**
 * Identifica se o e-mail já pertence a um voluntário (com ou sem conta no app).
 *
 * @phpstan-type IdentityResult array{
 *     status: 'new'|'existing'|'privileged',
 *     has_app_account: bool,
 *     message: string|null,
 *     user: ?User,
 *     volunteer: ?Volunteer,
 * }
 */
final class VolunteerSignupIdentity
{
    /**
     * @return IdentityResult
     */
    public static function resolve(string $emailNorm, ?int $actingUserId = null): array
    {
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($emailNorm) ?? '';
        if ($emailNorm === '') {
            return [
                'status' => 'new',
                'has_app_account' => false,
                'message' => null,
                'user' => null,
                'volunteer' => null,
            ];
        }

        $user = User::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->first();

        if ($msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($user, $actingUserId)) {
            return [
                'status' => 'privileged',
                'has_app_account' => false,
                'message' => $msg,
                'user' => $user,
                'volunteer' => null,
            ];
        }

        $volunteer = null;
        if ($user !== null) {
            $user->loadMissing('volunteerProfile');
            $volunteer = $user->volunteerProfile;
        }

        if ($volunteer === null) {
            $volunteer = Volunteer::query()
                ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
                ->orderByDesc('id')
                ->first();
        }

        $isVolunteer = $volunteer !== null
            || ($user !== null && (bool) $user->is_volunteer);

        if (! $isVolunteer) {
            return [
                'status' => 'new',
                'has_app_account' => false,
                'message' => null,
                'user' => $user,
                'volunteer' => null,
            ];
        }

        $hasAppAccount = ($volunteer !== null && $volunteer->user_id !== null)
            || ($user !== null && $user->volunteerProfile !== null);

        return [
            'status' => 'existing',
            'has_app_account' => $hasAppAccount,
            'message' => null,
            'user' => $user,
            'volunteer' => $volunteer,
        ];
    }
}
