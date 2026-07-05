<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\Volunteer;

final class MissionVolunteerAccountResolver
{
    public static function userForVolunteer(MissionVolunteer $volunteer): ?User
    {
        $churchId = (int) $volunteer->church_id;

        if ($volunteer->submitted_by_user_id) {
            $submitter = User::query()
                ->where('church_id', $churchId)
                ->find($volunteer->submitted_by_user_id);
            if ($submitter !== null) {
                return $submitter;
            }
        }

        $email = self::normalizeEmail($volunteer->display_email);
        if ($email !== null) {
            $byEmail = User::query()
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->first();
            if ($byEmail !== null) {
                return $byEmail;
            }
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone((string) $volunteer->phone);
        if ($phoneNorm !== null) {
            $users = User::query()
                ->where('church_id', $churchId)
                ->get(['id', 'email', 'phone']);

            foreach ($users as $user) {
                if (VolunteerContactDuplicateChecker::normalizePhone($user->phone) === $phoneNorm) {
                    return $user;
                }
            }
        }

        $viaVolunteerProfile = self::userViaVolunteerProfile($volunteer, $email, $phoneNorm);
        if ($viaVolunteerProfile !== null) {
            return $viaVolunteerProfile;
        }

        return self::userByUniqueNameInChurch($churchId, (string) $volunteer->full_name);
    }

    public static function emailForVolunteer(MissionVolunteer $volunteer, ?User $user = null): ?string
    {
        $user ??= self::userForVolunteer($volunteer);

        if ($user !== null) {
            $fromUser = trim((string) ($user->email ?? ''));

            return $fromUser !== '' ? $fromUser : null;
        }

        return self::normalizeEmail($volunteer->display_email);
    }

    private static function userViaVolunteerProfile(
        MissionVolunteer $volunteer,
        ?string $emailNorm,
        ?string $phoneNorm,
    ): ?User {
        $churchId = (int) $volunteer->church_id;

        $query = Volunteer::query()
            ->whereNotNull('user_id')
            ->whereHas('user', fn ($q) => $q->where('church_id', $churchId));

        if ($emailNorm !== null) {
            $byEmail = (clone $query)
                ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
                ->with('user')
                ->first();
            if ($byEmail?->user !== null) {
                return $byEmail->user;
            }
        }

        if ($phoneNorm !== null) {
            foreach ((clone $query)->get(['id', 'phone', 'user_id']) as $vol) {
                if (VolunteerContactDuplicateChecker::normalizePhone($vol->phone) === $phoneNorm) {
                    return User::query()
                        ->where('church_id', $churchId)
                        ->find($vol->user_id);
                }
            }
        }

        return null;
    }

    private static function userByUniqueNameInChurch(int $churchId, string $fullName): ?User
    {
        $nameNorm = self::normalizeComparableName($fullName);
        if ($nameNorm === null || mb_strlen($nameNorm) < 6) {
            return null;
        }

        $matches = User::query()
            ->where('church_id', $churchId)
            ->get(['id', 'name'])
            ->filter(fn (User $user) => self::normalizeComparableName($user->name) === $nameNorm)
            ->values();

        if ($matches->count() !== 1) {
            return null;
        }

        return User::query()->find($matches->first()->id);
    }

    private static function normalizeComparableName(string $name): ?string
    {
        $normalized = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $name) ?? ''));

        return $normalized !== '' ? $normalized : null;
    }

    private static function normalizeEmail(?string $email): ?string
    {
        return VolunteerContactDuplicateChecker::normalizeEmail($email);
    }
}
