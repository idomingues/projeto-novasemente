<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Mescla respostas com o cadastro existente e valida só os campos enviados no autosave.
 */
final class VolunteerSignupAutosave
{
    /** @var list<string> */
    private const ALLOWED_KEYS = [
        'first_name',
        'last_name',
        'birth_date',
        'has_whatsapp',
        'email',
        'phone',
        'has_social_networks',
        'social_network_profiles',
        'professional_area',
        'attendance_duration',
        'is_official_member',
        'volunteer_phase',
        'service_ease_areas',
        'comfortable_with_digital_tools',
        'service_greatest_strength',
        'service_greatest_challenge',
        'lgpd_data_consent',
    ];

    /**
     * @return array{
     *     merged: array<string, mixed>,
     *     validated: array<string, mixed>,
     *     autosave_fields: list<string>
     * }
     */
    public function mergeAndValidate(User $user, Request $request, int $churchId): array
    {
        $autosaveFields = $request->input('autosave_fields');
        if (is_string($autosaveFields)) {
            $decoded = json_decode($autosaveFields, true);
            $autosaveFields = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($autosaveFields) || $autosaveFields === []) {
            throw ValidationException::withMessages([
                'autosave_fields' => ['Informe quais respostas devem ser salvas.'],
            ]);
        }

        $autosaveFields = array_values(array_unique(array_filter(
            array_map('strval', $autosaveFields),
            fn (string $key) => in_array($key, self::ALLOWED_KEYS, true) || $key === 'photo_file'
        )));

        if ($autosaveFields === [] && ! $request->hasFile('photo_file')) {
            throw ValidationException::withMessages([
                'autosave_fields' => ['Nenhum campo válido para salvar.'],
            ]);
        }

        $prefill = VolunteerSignupFormPrefill::forUser($user);
        $merged = $this->mergePrefillWithRequest($prefill, $request);
        $merged = VolunteerSignupPayloadNormalizer::applyBranching($merged);

        $minBirthDate = now()->subYears(10)->toDateString();
        $hasExistingPhoto = is_string($user->photo_url) && trim($user->photo_url) !== '';

        $rules = [];
        $fieldKeys = array_filter($autosaveFields, fn (string $k) => $k !== 'photo_file');

        foreach ($fieldKeys as $field) {
            $rules = array_merge($rules, VolunteerSignupValidation::rulesForAutosaveField(
                $field,
                $user,
                $merged,
                $minBirthDate
            ));
        }

        if ($request->hasFile('photo_file') || in_array('photo_file', $autosaveFields, true)) {
            if (! $hasExistingPhoto && ! $request->hasFile('photo_file')) {
                throw ValidationException::withMessages([
                    'photo_file' => ['Tire ou envie uma foto antes de salvar.'],
                ]);
            }
        }

        $validatedSlice = $fieldKeys !== [] && $rules !== []
            ? $request->validate($rules)
            : [];

        $validated = $this->buildValidatedFromMerged($merged, $validatedSlice);
        $this->assertBranchRules($validated, $autosaveFields);

        if (in_array('email', $autosaveFields, true)) {
            $this->assertEmailAvailable($user, (string) $validated['email']);
        }

        return [
            'merged' => $merged,
            'validated' => $validated,
            'autosave_fields' => $autosaveFields,
        ];
    }

    /**
     * @param  array<string, mixed>  $prefill
     * @return array<string, mixed>
     */
    private function mergePrefillWithRequest(array $prefill, Request $request): array
    {
        $firstName = $request->has('first_name')
            ? trim((string) $request->input('first_name'))
            : (string) ($prefill['first_name'] ?? '');
        $lastName = $request->has('last_name')
            ? trim((string) $request->input('last_name'))
            : (string) ($prefill['last_name'] ?? '');

        $merged = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'birth_date' => $request->has('birth_date')
                ? (string) $request->input('birth_date')
                : (string) ($prefill['birth_date'] ?? ''),
            'has_whatsapp' => $request->has('has_whatsapp')
                ? $request->input('has_whatsapp')
                : ($prefill['has_whatsapp'] ?? null),
            'email' => $request->has('email')
                ? (string) $request->input('email')
                : (string) ($prefill['email'] ?? ''),
            'phone' => $request->has('phone')
                ? (string) $request->input('phone')
                : (string) ($prefill['phone'] ?? ''),
            'has_social_networks' => $request->has('has_social_networks')
                ? $request->input('has_social_networks')
                : ($prefill['has_social_networks'] ?? null),
            'social_network_profiles' => $request->has('social_network_profiles')
                ? (string) $request->input('social_network_profiles')
                : (string) ($prefill['social_network_profiles'] ?? ''),
            'professional_area' => $request->has('professional_area')
                ? (string) $request->input('professional_area')
                : (string) ($prefill['professional_area'] ?? ''),
            'attendance_duration' => $request->has('attendance_duration')
                ? (string) $request->input('attendance_duration')
                : (string) ($prefill['attendance_duration'] ?? ''),
            'is_official_member' => $request->has('is_official_member')
                ? $request->input('is_official_member')
                : ($prefill['is_official_member'] ?? null),
            'volunteer_phase' => $request->has('volunteer_phase')
                ? (string) $request->input('volunteer_phase')
                : (string) ($prefill['volunteer_phase'] ?? ''),
            'service_ease_areas' => $request->has('service_ease_areas')
                ? $request->input('service_ease_areas', [])
                : ($prefill['service_ease_areas'] ?? []),
            'comfortable_with_digital_tools' => $request->has('comfortable_with_digital_tools')
                ? $request->input('comfortable_with_digital_tools')
                : ($prefill['comfortable_with_digital_tools'] ?? null),
            'service_greatest_strength' => $request->has('service_greatest_strength')
                ? (string) $request->input('service_greatest_strength')
                : (string) ($prefill['service_greatest_strength'] ?? ''),
            'service_greatest_challenge' => $request->has('service_greatest_challenge')
                ? (string) $request->input('service_greatest_challenge')
                : (string) ($prefill['service_greatest_challenge'] ?? ''),
            'lgpd_data_consent' => $request->has('lgpd_data_consent')
                ? $request->input('lgpd_data_consent')
                : ($prefill['lgpd_data_consent'] ?? null),
            'password' => $request->input('password'),
        ];

        return VolunteerSignupPayloadNormalizer::applyBranching($merged);
    }

    /**
     * @param  array<string, mixed>  $merged
     * @param  array<string, mixed>  $validatedSlice
     * @return array<string, mixed>
     */
    private function buildValidatedFromMerged(array $merged, array $validatedSlice): array
    {
        $out = array_merge($merged, $validatedSlice);

        foreach ([
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'comfortable_with_digital_tools',
            'lgpd_data_consent',
        ] as $boolField) {
            if (array_key_exists($boolField, $out)) {
                $out[$boolField] = filter_var($out[$boolField], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
            }
        }

        $out['service_ease_areas'] = VolunteerSignupServiceEaseAreas::decode($out['service_ease_areas'] ?? []);

        return $out;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  list<string>  $autosaveFields
     */
    private function assertBranchRules(array $validated, array $autosaveFields): void
    {
        if (($validated['has_social_networks'] ?? false) === true
            && (in_array('social_network_profiles', $autosaveFields, true)
                || in_array('has_social_networks', $autosaveFields, true))
            && trim((string) ($validated['social_network_profiles'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'social_network_profiles' => ['Informe o nome do seu perfil nas redes sociais.'],
            ]);
        }

        if (in_array('service_ease_areas', $autosaveFields, true)
            && ! VolunteerSignupServiceEaseAreas::hasSelection($validated['service_ease_areas'] ?? [])) {
            throw ValidationException::withMessages([
                'service_ease_areas' => ['Selecione pelo menos uma área em que você tem facilidade para servir.'],
            ]);
        }
    }

    private function assertEmailAvailable(User $user, string $email): void
    {
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($email);
        $existingOther = $emailNorm
            ? \App\Models\User::query()
                ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
                ->where('id', '!=', $user->id)
                ->first()
            : null;

        if ($msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($existingOther, $user->id)) {
            throw ValidationException::withMessages(['email' => [$msg]]);
        }
    }
}
