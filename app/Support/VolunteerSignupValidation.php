<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Regras compartilhadas de validação do questionário v2 (cadastro, edição e autosave).
 */
final class VolunteerSignupValidation
{
    /** @return list<string> */
    public static function attendanceDurationSlugs(): array
    {
        return array_keys(config('volunteer_signup.attendance_duration', []));
    }

    /** @return list<string> */
    public static function volunteerPhaseSlugs(): array
    {
        return array_keys(config('volunteer_signup.volunteer_phase', []));
    }

    /**
     * Cadastro público por token: e-mail pode já existir (recadastro / vínculo com usuário).
     *
     * @return array<string, mixed>
     */
    public static function publicSignupRules(Request $request, string $minBirthDate): array
    {
        $rules = self::baseRules(new User, $request, $minBirthDate);
        $rules['email'] = ['required', 'string', 'lowercase', 'email', 'max:255'];

        return $rules;
    }

    /**
     * @return array<string, mixed>
     */
    public static function baseRules(User $user, Request $request, string $minBirthDate): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:155'],
            'birth_date' => ['required', 'date', 'before_or_equal:'.$minBirthDate],
            'has_whatsapp' => [
                Rule::requiredIf(fn () => trim((string) $request->input('phone', '')) !== ''),
                'nullable',
                'boolean',
            ],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:50'],
            'has_social_networks' => ['required', 'boolean'],
            'social_network_profiles' => [
                Rule::requiredIf(fn () => $request->boolean('has_social_networks')),
                'nullable',
                'string',
                'max:2000',
            ],
            'professional_area' => ['required', 'string', 'max:5000'],
            'attendance_duration' => ['required', 'string', Rule::in(self::attendanceDurationSlugs())],
            'is_official_member' => ['required', 'boolean'],
            'volunteer_phase' => ['required', 'string', Rule::in(self::volunteerPhaseSlugs())],
            'desired_ministry_ids' => ['nullable', 'array'],
            'desired_ministry_ids.*' => ['integer', 'min:1'],
            'service_ease_areas' => ['required', 'array', 'min:1'],
            'service_ease_areas.*' => ['string', Rule::in(VolunteerSignupServiceEaseAreas::allowedSlugs())],
            'service_activity_types' => ['required', 'array', 'min:1'],
            'service_activity_types.*' => ['string', Rule::in(VolunteerSignupServiceActivityTypes::allowedSlugs())],
            'comfortable_with_digital_tools' => ['required', 'boolean'],
            'service_greatest_strength' => ['required', 'string', 'max:5000'],
            'service_greatest_challenge' => ['required', 'string', 'max:5000'],
            'lgpd_data_consent' => ['required', 'boolean'],
            'redirect_after_save' => ['nullable', 'string', 'max:80'],
            'focus_missing_only' => ['nullable', 'boolean'],
            'resume_page' => ['nullable', 'integer', 'min:0', 'max:2'],
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public static function assertConditionalRules(array $validated): void
    {
        if (($validated['has_social_networks'] ?? false) === true) {
            $profiles = trim((string) ($validated['social_network_profiles'] ?? ''));
            if ($profiles === '') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'social_network_profiles' => ['Informe o perfil do Instagram/Facebook.'],
                ]);
            }
        }

        if (($validated['lgpd_data_consent'] ?? false) !== true) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'lgpd_data_consent' => ['Para continuar, é necessário autorizar o uso dos dados conforme a LGPD.'],
            ]);
        }
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    public static function normalizeMinistryIdsForChurch(array $ids, int $churchId, string $errorKey): array
    {
        $normalized = array_values(array_unique(array_filter(array_map('intval', $ids), fn ($id) => $id > 0)));
        if ($normalized === []) {
            return [];
        }

        $allowedCount = \App\Models\Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $normalized)
            ->count();

        if ($allowedCount !== count($normalized)) {
            throw ValidationException::withMessages([
                $errorKey => ['Selecione apenas departamentos válidos desta igreja.'],
            ]);
        }

        return $normalized;
    }

    /**
     * @param  array<string, mixed>  $merged
     * @return array<string, mixed>
     */
    public static function rulesForAutosaveField(string $field, User $user, array $merged, string $minBirthDate): array
    {
        return match ($field) {
            'first_name' => ['first_name' => ['required', 'string', 'max:100']],
            'last_name' => ['last_name' => ['required', 'string', 'max:155']],
            'birth_date' => [
                'birth_date' => ['required', 'date', 'before_or_equal:'.$minBirthDate],
            ],
            'has_whatsapp' => [
                'has_whatsapp' => [
                    Rule::requiredIf(fn () => trim((string) ($merged['phone'] ?? '')) !== ''),
                    'boolean',
                ],
            ],
            'email' => [
                'email' => [
                    'required',
                    'string',
                    'lowercase',
                    'email',
                    'max:255',
                    Rule::unique('users', 'email')->ignore($user->id),
                ],
            ],
            'phone' => ['phone' => ['nullable', 'string', 'max:50']],
            'has_social_networks' => ['has_social_networks' => ['required', 'boolean']],
            'social_network_profiles' => [
                'social_network_profiles' => [
                    Rule::requiredIf(fn () => ($merged['has_social_networks'] ?? false) === true
                        || filter_var($merged['has_social_networks'] ?? null, FILTER_VALIDATE_BOOLEAN)),
                    'nullable',
                    'string',
                    'max:2000',
                ],
            ],
            'professional_area' => ['professional_area' => ['required', 'string', 'max:5000']],
            'attendance_duration' => [
                'attendance_duration' => ['required', 'string', Rule::in(self::attendanceDurationSlugs())],
            ],
            'is_official_member' => ['is_official_member' => ['required', 'boolean']],
            'volunteer_phase' => [
                'volunteer_phase' => ['required', 'string', Rule::in(self::volunteerPhaseSlugs())],
            ],
            'desired_ministry_ids' => [
                'desired_ministry_ids' => ['nullable', 'array'],
                'desired_ministry_ids.*' => ['integer', 'min:1'],
            ],
            'service_ease_areas' => [
                'service_ease_areas' => ['required', 'array', 'min:1'],
                'service_ease_areas.*' => ['string', Rule::in(VolunteerSignupServiceEaseAreas::allowedSlugs())],
            ],
            'service_activity_types' => [
                'service_activity_types' => ['required', 'array', 'min:1'],
                'service_activity_types.*' => ['string', Rule::in(VolunteerSignupServiceActivityTypes::allowedSlugs())],
            ],
            'comfortable_with_digital_tools' => ['comfortable_with_digital_tools' => ['required', 'boolean']],
            'service_greatest_strength' => ['service_greatest_strength' => ['required', 'string', 'max:5000']],
            'service_greatest_challenge' => ['service_greatest_challenge' => ['required', 'string', 'max:5000']],
            'lgpd_data_consent' => ['lgpd_data_consent' => ['required', 'boolean']],
            default => [],
        };
    }
}
