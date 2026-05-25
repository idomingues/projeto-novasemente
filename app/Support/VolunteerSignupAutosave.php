<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Mescla respostas com o cadastro existente e valida só os campos enviados no autosave.
 */
final class VolunteerSignupAutosave
{
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

        $allowedKeys = [
            'first_name',
            'last_name',
            'birth_date',
            'has_whatsapp',
            'email',
            'phone',
            'has_social_networks',
            'attendance_duration',
            'is_official_member',
            'member_record_at_nova_semente',
            'member_record_church',
            'has_previous_ministry_volunteer_experience',
            'previous_ministry_ids',
            'is_active_in_ministry',
            'active_ministry_ids',
            'wants_other_ministry',
            'other_ministry_ids',
            'gifts_to_develop',
            'professional_area',
            'lgpd_data_consent',
        ];

        $autosaveFields = array_values(array_unique(array_filter(
            array_map('strval', $autosaveFields),
            fn (string $key) => in_array($key, $allowedKeys, true) || $key === 'photo_file'
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
            $rules = array_merge($rules, $this->rulesForField(
                $field,
                $user,
                $request,
                $merged,
                $minBirthDate,
                $churchId
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
        $this->assertBranchRules($validated, $autosaveFields, $churchId);

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
            'attendance_duration' => $request->has('attendance_duration')
                ? (string) $request->input('attendance_duration')
                : (string) ($prefill['attendance_duration'] ?? ''),
            'is_official_member' => $request->has('is_official_member')
                ? $request->input('is_official_member')
                : ($prefill['is_official_member'] ?? null),
            'member_record_at_nova_semente' => $request->has('member_record_at_nova_semente')
                ? $request->input('member_record_at_nova_semente')
                : ($prefill['member_record_at_nova_semente'] ?? null),
            'member_record_church' => $request->has('member_record_church')
                ? (string) $request->input('member_record_church')
                : (string) ($prefill['member_record_church'] ?? ''),
            'has_previous_ministry_volunteer_experience' => $request->has('has_previous_ministry_volunteer_experience')
                ? $request->input('has_previous_ministry_volunteer_experience')
                : ($prefill['has_previous_ministry_volunteer_experience'] ?? null),
            'previous_ministry_ids' => $request->has('previous_ministry_ids')
                ? $request->input('previous_ministry_ids', [])
                : ($prefill['previous_ministry_ids'] ?? []),
            'is_active_in_ministry' => $request->has('is_active_in_ministry')
                ? $request->input('is_active_in_ministry')
                : ($prefill['is_active_in_ministry'] ?? null),
            'active_ministry_ids' => $request->has('active_ministry_ids')
                ? $request->input('active_ministry_ids', [])
                : ($prefill['active_ministry_ids'] ?? []),
            'wants_other_ministry' => $request->has('wants_other_ministry')
                ? $request->input('wants_other_ministry')
                : ($prefill['wants_other_ministry'] ?? null),
            'other_ministry_ids' => $request->has('other_ministry_ids')
                ? $request->input('other_ministry_ids', [])
                : ($prefill['other_ministry_ids'] ?? []),
            'gifts_to_develop' => $request->has('gifts_to_develop')
                ? (string) $request->input('gifts_to_develop')
                : (string) ($prefill['gifts_to_develop'] ?? ''),
            'professional_area' => $request->has('professional_area')
                ? (string) $request->input('professional_area')
                : (string) ($prefill['professional_area'] ?? ''),
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
            'member_record_at_nova_semente',
            'has_previous_ministry_volunteer_experience',
            'is_active_in_ministry',
            'wants_other_ministry',
            'lgpd_data_consent',
        ] as $boolField) {
            if (array_key_exists($boolField, $out)) {
                $out[$boolField] = filter_var($out[$boolField], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false;
            }
        }

        $out['previous_ministry_ids'] = $this->normalizeIdList($out['previous_ministry_ids'] ?? []);
        $out['active_ministry_ids'] = $this->normalizeIdList($out['active_ministry_ids'] ?? []);
        $out['other_ministry_ids'] = $this->normalizeIdList($out['other_ministry_ids'] ?? []);

        return $out;
    }

    /**
     * @param  array<string, mixed>  $merged
     * @return array<string, mixed>
     */
    private function rulesForField(
        string $field,
        User $user,
        Request $request,
        array $merged,
        string $minBirthDate,
        int $churchId,
    ): array {
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
            'attendance_duration' => ['attendance_duration' => ['required', 'string', 'max:50']],
            'is_official_member' => ['is_official_member' => ['required', 'boolean']],
            'member_record_at_nova_semente' => ['member_record_at_nova_semente' => ['nullable', 'boolean']],
            'member_record_church' => ['member_record_church' => ['nullable', 'string', 'max:255']],
            'has_previous_ministry_volunteer_experience' => [
                'has_previous_ministry_volunteer_experience' => ['required', 'boolean'],
            ],
            'previous_ministry_ids' => [
                'previous_ministry_ids' => ['nullable', 'array'],
                'previous_ministry_ids.*' => ['integer'],
            ],
            'is_active_in_ministry' => ['is_active_in_ministry' => ['required', 'boolean']],
            'active_ministry_ids' => [
                'active_ministry_ids' => ['nullable', 'array'],
                'active_ministry_ids.*' => ['integer'],
            ],
            'wants_other_ministry' => ['wants_other_ministry' => ['required', 'boolean']],
            'other_ministry_ids' => [
                'other_ministry_ids' => ['nullable', 'array'],
                'other_ministry_ids.*' => ['integer'],
            ],
            'gifts_to_develop' => ['gifts_to_develop' => ['nullable', 'string', 'max:5000']],
            'professional_area' => ['professional_area' => ['nullable', 'string', 'max:5000']],
            'lgpd_data_consent' => ['lgpd_data_consent' => ['required', 'boolean']],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  list<string>  $autosaveFields
     */
    private function assertBranchRules(array $validated, array $autosaveFields, int $churchId): void
    {
        if (($validated['is_official_member'] ?? false) === true) {
            if (in_array('member_record_at_nova_semente', $autosaveFields, true)
                && (! array_key_exists('member_record_at_nova_semente', $validated) || $validated['member_record_at_nova_semente'] === null)) {
                throw ValidationException::withMessages([
                    'member_record_at_nova_semente' => ['Informe se o seu registro de membro está na Nova Semente.'],
                ]);
            }
            if (($validated['member_record_at_nova_semente'] ?? null) === false
                && in_array('member_record_church', $autosaveFields, true)
                && trim((string) ($validated['member_record_church'] ?? '')) === '') {
                throw ValidationException::withMessages([
                    'member_record_church' => ['Informe em qual igreja está o seu registro de membro.'],
                ]);
            }
        }

        if (($validated['has_previous_ministry_volunteer_experience'] ?? false) === true
            && in_array('previous_ministry_ids', $autosaveFields, true)) {
            $ids = $this->validateMinistryIdsForChurch(
                $validated['previous_ministry_ids'] ?? [],
                $churchId
            );
            if ($ids === []) {
                throw ValidationException::withMessages([
                    'previous_ministry_ids' => ['Selecione em quais ministérios você já serviu.'],
                ]);
            }
        }

        if (($validated['is_active_in_ministry'] ?? false) === true
            && in_array('active_ministry_ids', $autosaveFields, true)) {
            $ids = $this->validateMinistryIdsForChurch(
                $validated['active_ministry_ids'] ?? [],
                $churchId
            );
            if ($ids === []) {
                throw ValidationException::withMessages([
                    'active_ministry_ids' => ['Selecione pelo menos um ministério em que você é atuante.'],
                ]);
            }
        }

        if (($validated['wants_other_ministry'] ?? false) === true
            && in_array('other_ministry_ids', $autosaveFields, true)) {
            $ids = $this->validateMinistryIdsForChurch(
                $validated['other_ministry_ids'] ?? [],
                $churchId
            );
            if ($ids === []) {
                throw ValidationException::withMessages([
                    'other_ministry_ids' => ['Selecione pelo menos um ministério em que gostaria de servir.'],
                ]);
            }
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

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private function validateMinistryIdsForChurch(array $ids, int $churchId): array
    {
        $normalized = $this->normalizeIdList($ids);
        if ($normalized === []) {
            return [];
        }

        $allowedCount = Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $normalized)
            ->count();

        if ($allowedCount !== count($normalized)) {
            throw ValidationException::withMessages([
                'active_ministry_ids' => ['Selecione apenas departamentos válidos desta igreja.'],
            ]);
        }

        return $normalized;
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private function normalizeIdList(array $ids): array
    {
        return array_values(array_unique(array_filter(array_map('intval', $ids), fn ($id) => $id > 0)));
    }
}
