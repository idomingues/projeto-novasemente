<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Progresso do questionário de cadastro/edição de voluntário (espelha validação do PublicSignup).
 */
final class VolunteerSignupCompletion
{
    /** @var list<string> */
    public const OPTIONAL_FIELD_KEYS = [
        'phone',
        'password',
        'password_confirmation',
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
     * @return array{
     *     is_complete: bool,
     *     missing_count: int,
     *     total_required: int,
     *     percent: int,
     *     missing_fields: list<string>
     * }|null
     */
    public static function profileAlertForUser(User $user): ?array
    {
        if (! \Illuminate\Support\Facades\Route::has('volunteers.self-signup.edit')) {
            return null;
        }

        if (! (bool) ($user->is_volunteer ?? false)) {
            return null;
        }

        return self::incompleteForUser($user);
    }

    /**
     * Cadastro incompleto em que a única pendência obrigatória é a data de nascimento.
     *
     * @param  array{missing_fields?: list<string>}|null  $completion
     */
    public static function onlyBirthDateMissing(?array $completion): bool
    {
        if ($completion === null) {
            return false;
        }

        $missing = array_values(array_filter(
            $completion['missing_fields'] ?? [],
            fn ($field) => is_string($field) && $field !== '',
        ));

        return $missing === ['birth_date'];
    }

    /**
     * @param  list<string>  $missingFields
     */
    public static function describeMissingFields(array $missingFields): string
    {
        if ($missingFields === []) {
            return '';
        }

        $labels = [
            'photo_file' => 'Foto',
            'full_name' => 'Nome completo',
            'birth_date' => 'Data de nascimento válida (mínimo 10 anos)',
            'has_whatsapp' => 'WhatsApp no telefone',
            'email' => 'E-mail',
            'has_social_networks' => 'Uso de redes sociais',
            'social_network_profiles' => 'Nome do perfil nas redes sociais',
            'professional_area' => 'Área de atuação profissional',
            'attendance_duration' => 'Tempo de frequência na Nova Semente',
            'is_official_member' => 'Membro oficial da Igreja Adventista do 7º dia',
            'volunteer_phase' => 'Fase no voluntariado da Nova Semente',
            'service_ease_areas' => 'Áreas de facilidade para servir',
            'service_activity_types' => 'Tipos de atividade em que você rende melhor',
            'comfortable_with_digital_tools' => 'Conforto com ferramentas digitais',
            'service_greatest_strength' => 'Maior ponto forte no serviço',
            'service_greatest_challenge' => 'Maior desafio ao servir',
            'lgpd_data_consent' => 'Consentimento LGPD',
        ];

        $readable = array_map(
            fn (string $field) => $labels[$field] ?? $field,
            $missingFields
        );

        if (count($readable) === 1) {
            return $readable[0];
        }

        if (count($readable) === 2) {
            return $readable[0].' e '.$readable[1];
        }

        $last = array_pop($readable);

        return implode(', ', $readable).' e '.$last;
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

        $hasSocialNetworks = self::normalizeBool($initial['has_social_networks'] ?? null);
        $track('has_social_networks', true, $hasSocialNetworks !== null);

        if ($hasSocialNetworks === true) {
            $track(
                'social_network_profiles',
                true,
                trim((string) ($initial['social_network_profiles'] ?? '')) !== ''
            );
        }

        $track('professional_area', true, trim((string) ($initial['professional_area'] ?? '')) !== '');

        $track('attendance_duration', true, trim((string) ($initial['attendance_duration'] ?? '')) !== '');

        $track('is_official_member', true, self::isBoolSet($initial['is_official_member'] ?? null));

        $track('volunteer_phase', true, self::isValidVolunteerPhase($initial['volunteer_phase'] ?? null));

        $track(
            'service_ease_areas',
            true,
            VolunteerSignupServiceEaseAreas::hasSelection($initial['service_ease_areas'] ?? null)
        );

        $track(
            'service_activity_types',
            true,
            VolunteerSignupServiceActivityTypes::hasSelection($initial['service_activity_types'] ?? null)
        );

        $track(
            'comfortable_with_digital_tools',
            true,
            self::isBoolSet($initial['comfortable_with_digital_tools'] ?? null)
        );

        $track(
            'service_greatest_strength',
            true,
            trim((string) ($initial['service_greatest_strength'] ?? '')) !== ''
        );

        $track(
            'service_greatest_challenge',
            true,
            trim((string) ($initial['service_greatest_challenge'] ?? '')) !== ''
        );

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

    private static function isValidVolunteerPhase(mixed $value): bool
    {
        $slug = trim((string) ($value ?? ''));

        return $slug !== '' && array_key_exists($slug, config('volunteer_signup.volunteer_phase', []));
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
