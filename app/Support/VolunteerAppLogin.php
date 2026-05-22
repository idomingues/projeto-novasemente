<?php

namespace App\Support;

use App\Models\User;
use App\Models\Volunteer;

/**
 * Conta na app (users) vs registro de voluntário (volunteers).
 */
class VolunteerAppLogin
{
    public static function loginReady(Volunteer $volunteer): bool
    {
        if ($volunteer->user_id === null) {
            return false;
        }

        $user = $volunteer->relationLoaded('user')
            ? $volunteer->user
            : User::query()->find($volunteer->user_id);

        return $user !== null && trim((string) ($user->email ?? '')) !== '';
    }

    /**
     * Copia o e-mail do cadastro de voluntário para users quando a conta ainda não tem login.
     */
    public static function syncLoginEmailFromVolunteer(User $user, Volunteer $volunteer): User
    {
        $volunteerEmail = VolunteerContactDuplicateChecker::normalizeEmail($volunteer->email);
        if ($volunteerEmail === null) {
            return $user;
        }

        $current = VolunteerContactDuplicateChecker::normalizeEmail($user->email);
        if ($current !== null && $current !== '') {
            return $user;
        }

        $user->forceFill(['email' => $volunteerEmail])->save();

        return $user->fresh();
    }

    public static function findVolunteerByEmail(string $email): ?Volunteer
    {
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($email);
        if ($emailNorm === null) {
            return null;
        }

        return Volunteer::query()
            ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Motivo quando o login falha (para mensagem mais clara na tela).
     *
     * @return 'volunteer_without_account'|'not_found'|null
     */
    public static function loginFailureReason(string $login): ?string
    {
        if (self::findUserByLogin($login) !== null) {
            return null;
        }

        $trimmed = trim($login);
        if ($trimmed === '') {
            return 'not_found';
        }

        if (str_contains($trimmed, '@')) {
            $volunteer = self::findVolunteerByEmail($trimmed);
            if ($volunteer !== null && $volunteer->user_id === null) {
                return 'volunteer_without_account';
            }
        }

        return 'not_found';
    }

    public static function findUserByLogin(string $login): ?User
    {
        $trimmed = trim($login);
        if ($trimmed === '') {
            return null;
        }

        if (str_contains($trimmed, '@')) {
            $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($trimmed);
            if ($emailNorm !== null) {
                $byEmail = User::query()
                    ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
                    ->first();
                if ($byEmail) {
                    return $byEmail;
                }

                $byVolunteer = self::findVolunteerByEmail($trimmed);
                if ($byVolunteer?->user_id) {
                    $user = User::query()->find($byVolunteer->user_id);
                    if ($user) {
                        return self::syncLoginEmailFromVolunteer($user, $byVolunteer);
                    }
                }
            }
        }

        $nameNorm = mb_strtolower(preg_replace('/\s+/u', ' ', $trimmed), 'UTF-8');
        $byName = User::query()
            ->whereRaw('LOWER(TRIM(COALESCE(name, ""))) = ?', [$nameNorm])
            ->first();
        if ($byName) {
            return $byName;
        }

        $byVolunteer = self::findVolunteerByEmail($trimmed);
        if ($byVolunteer?->user_id) {
            $user = User::query()->find($byVolunteer->user_id);

            return $user ? self::syncLoginEmailFromVolunteer($user, $byVolunteer) : null;
        }

        return null;
    }
}
