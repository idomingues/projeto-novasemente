<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Progresso do questionário de cadastro/edição de voluntário (espelha validação do PublicSignup).
 *
 * Não entram no cálculo (opcionais): telefone, dons, área profissional, senha.
 */
final class VolunteerSignupCompletion
{
    /** @var list<string> */
    public const OPTIONAL_FIELD_KEYS = [
        'phone',
        'gifts_to_develop',
        'professional_area',
        'password',
        'password_confirmation',
        'current_password',
    ];

    /**
     * @return array{
     *     is_complete: bool,
     *     missing_count: int,
     *     total_required: int,
     *     percent: int,
     *     missing_fields: list<string>
     * }
     */
    public static function forUser(User $user): array
    {
        $user->loadMissing('volunteerProfile');
        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');

        return self::fromInitial(VolunteerSignupFormPrefill::forUser($user));
    }

    /**
     * Retorna o progresso apenas enquanto o questionário não estiver completo (para alertas na app).
     *
     * @return array{
     *     is_complete: bool,
     *     missing_count: int,
     *     total_required: int,
     *     percent: int,
     *     missing_fields: list<string>
     * }|null
     */
    public static function incompleteForUser(User $user): ?array
    {
        $completion = self::forUser($user);

        return $completion['is_complete'] ? null : $completion;
    }

    /**
     * @param  array<string, mixed>  $initial
     * @return array{
     *     is_complete: bool,
     *     missing_count: int,
     *     total_required: int,
     *     percent: int,
     *     missing_fields: list<string>
     * }
     */
    public static function fromInitial(array $initial): array
    {
        $applicable = [];
        $missing = [];

        $track = static function (string $field, bool $isApplicable, bool $isFilled) use (&$applicable, &$missing): void {
            if (! $isApplicable) {
                return;
            }
            $applicable[] = $field;
            if (! $isFilled) {
                $missing[] = $field;
            }
        };

        $hasExistingPhoto = ($initial['has_existing_photo'] ?? false) === true;
        $track('photo_file', true, $hasExistingPhoto);

        $fullName = trim((string) ($initial['full_name'] ?? ''));
        $parts = preg_split('/\s+/u', $fullName, 2) ?: [];
        $track('full_name', true, count($parts) >= 2 && trim($parts[1] ?? '') !== '');

        $birthDate = trim((string) ($initial['birth_date'] ?? ''));
        $track('birth_date', true, $birthDate !== '' && self::isBirthDateAtLeastMinAge($birthDate, 10));

        $phoneFilled = trim((string) ($initial['phone'] ?? '')) !== '';
        $track('has_whatsapp', $phoneFilled, $phoneFilled ? self::isBoolSet($initial['has_whatsapp'] ?? null) : true);

        $email = trim((string) ($initial['email'] ?? ''));
        $track('email', true, $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false);

        $track('has_social_networks', true, self::isBoolSet($initial['has_social_networks'] ?? null));

        $track('attendance_duration', true, trim((string) ($initial['attendance_duration'] ?? '')) !== '');

        $isOfficialMember = self::normalizeBool($initial['is_official_member'] ?? null);
        $track('is_official_member', true, $isOfficialMember !== null);

        if ($isOfficialMember === true) {
            $memberAtNovaSemente = self::normalizeBool($initial['member_record_at_nova_semente'] ?? null);
            $track('member_record_at_nova_semente', true, $memberAtNovaSemente !== null);

            if ($memberAtNovaSemente === false) {
                $track(
                    'member_record_church',
                    true,
                    trim((string) ($initial['member_record_church'] ?? '')) !== ''
                );
            }
        }

        $hasPrevious = self::normalizeBool($initial['has_previous_ministry_volunteer_experience'] ?? null);
        $track('has_previous_ministry_volunteer_experience', true, $hasPrevious !== null);

        if ($hasPrevious === true) {
            $track(
                'previous_ministry_ids',
                true,
                VolunteerSignupMinistryMapper::hasMinistrySelection(
                    $initial['previous_ministry_ids'] ?? [],
                    isset($initial['previous_ministry_details']) ? (string) $initial['previous_ministry_details'] : null
                )
            );
        }

        $isActive = self::normalizeBool($initial['is_active_in_ministry'] ?? null);
        $track('is_active_in_ministry', true, $isActive !== null);

        if ($isActive === true) {
            $track(
                'active_ministry_ids',
                true,
                VolunteerSignupMinistryMapper::hasMinistrySelection(
                    $initial['active_ministry_ids'] ?? [],
                    isset($initial['ministry_involvement']) ? (string) $initial['ministry_involvement'] : null
                )
            );
        }

        $wantsOther = self::normalizeBool($initial['wants_other_ministry'] ?? null);
        $track('wants_other_ministry', true, $wantsOther !== null);

        if ($wantsOther === true) {
            $track(
                'other_ministry_ids',
                true,
                VolunteerSignupMinistryMapper::hasMinistrySelection(
                    $initial['other_ministry_ids'] ?? [],
                    isset($initial['other_ministry_interest']) ? (string) $initial['other_ministry_interest'] : null
                )
            );
        }

        $track('lgpd_data_consent', true, self::normalizeBool($initial['lgpd_data_consent'] ?? null) === true);

        $totalRequired = count($applicable);
        $missingCount = count($missing);
        $percent = $totalRequired > 0
            ? (int) round((($totalRequired - $missingCount) / $totalRequired) * 100)
            : 100;

        return [
            'is_complete' => $missingCount === 0,
            'missing_count' => $missingCount,
            'total_required' => $totalRequired,
            'percent' => min(100, max(0, $percent)),
            'missing_fields' => array_values($missing),
        ];
    }

    private static function isBoolSet(mixed $value): bool
    {
        return self::normalizeBool($value) !== null;
    }

    private static function normalizeBool(mixed $value): ?bool
    {
        if ($value === true || $value === 1 || $value === '1' || $value === 'true') {
            return true;
        }
        if ($value === false || $value === 0 || $value === '0' || $value === 'false') {
            return false;
        }

        return null;
    }

    /**
     * @param  array<int, mixed>|mixed  $ids
     */
    private static function hasPositiveIds(mixed $ids): bool
    {
        if (! is_array($ids)) {
            return false;
        }

        foreach ($ids as $id) {
            if ((int) $id > 0) {
                return true;
            }
        }

        return false;
    }

    private static function isBirthDateAtLeastMinAge(string $birthDate, int $minYears): bool
    {
        try {
            $maxAllowed = now()->subYears($minYears)->startOfDay();

            return Carbon::parse($birthDate)->startOfDay()->lte($maxAllowed);
        } catch (\Throwable) {
            return false;
        }
    }
}
