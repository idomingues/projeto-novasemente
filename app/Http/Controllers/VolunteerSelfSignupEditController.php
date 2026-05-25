<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\PersistVolunteerSignupQuestionnaire;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerSignupAutosave;
use App\Support\VolunteerSignupCompletion;
use App\Support\VolunteerSignupFormPrefill;
use App\Support\VolunteerSignupName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerSelfSignupEditController extends Controller
{
    /**
     * @param  array<int, mixed>  $ids
     */
    private function ministryNamesForChurch(array $ids, int $churchId): string
    {
        $normalized = array_values(array_unique(array_map('intval', $ids)));
        if ($normalized === []) {
            return '';
        }

        return Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $normalized)
            ->orderBy('name')
            ->pluck('name')
            ->join(', ');
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return array<int, int>
     */
    private function validateMinistryIdsForChurch(array $ids, int $churchId, string $errorKey): array
    {
        $normalized = array_values(array_unique(array_filter(array_map('intval', $ids), fn ($id) => $id > 0)));
        if ($normalized === []) {
            return [];
        }

        $allowedCount = Ministry::query()
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

    public function edit(Request $request): RedirectResponse|Response
    {
        $user = $request->user();
        if ($user === null) {
            return redirect()->route('login');
        }

        $churchId = $this->resolveChurchId($user, $request);
        if ($churchId === null) {
            return redirect()->route('mobile.profile')->with(
                'error',
                'Não foi possível identificar a igreja do seu cadastro. Entre em contato com a secretaria.'
            );
        }

        $church = Church::query()->find($churchId);
        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');

        $completion = VolunteerSignupCompletion::forUser($user);

        if ($request->boolean('missing') && $completion['is_complete']) {
            return redirect()->route('mobile.profile.edit')->with(
                'status',
                'Seu cadastro de voluntário já está completo.'
            );
        }

        $focusMissingOnly = $request->boolean('missing') && ! $completion['is_complete'];

        return Inertia::render('Volunteers/PublicSignup', [
            'mode' => 'edit',
            'churchName' => $church?->name ?? 'Nova Semente',
            'ministries' => $ministries,
            'initial' => VolunteerSignupFormPrefill::forUser($user),
            'cancelHref' => route('mobile.profile.edit'),
            'redirectAfterSave' => 'mobile.profile.edit',
            'focusMissingOnly' => $focusMissingOnly,
            'missingFields' => $focusMissingOnly ? $completion['missing_fields'] : [],
            'signupCompletion' => $completion,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user === null) {
            return redirect()->route('login');
        }

        $churchId = $this->resolveChurchId($user, $request);
        if ($churchId === null) {
            return redirect()->route('mobile.profile')->with(
                'error',
                'Não foi possível identificar a igreja do seu cadastro. Entre em contato com a secretaria.'
            );
        }

        $this->normalizeSignupBooleans($request);

        $minBirthDate = now()->subYears(10)->toDateString();
        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');
        $volunteer = $user->volunteerProfile;

        if ($volunteer === null) {
            return redirect()->route('mobile.profile')->with(
                'error',
                'Cadastro de voluntário não encontrado. Entre em contato com a secretaria.'
            );
        }

        $hasExistingPhoto = is_string($user->photo_url) && trim($user->photo_url) !== '';

        $validated = $request->validate(array_merge([
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
            'attendance_duration' => ['required', 'string', 'max:50'],
            'is_official_member' => ['required', 'boolean'],
            'member_record_at_nova_semente' => ['nullable', 'boolean'],
            'member_record_church' => ['nullable', 'string', 'max:255'],
            'has_previous_ministry_volunteer_experience' => ['required', 'boolean'],
            'previous_ministry_ids' => ['nullable', 'array'],
            'previous_ministry_ids.*' => ['integer'],
            'is_active_in_ministry' => ['required', 'boolean'],
            'active_ministry_ids' => ['nullable', 'array'],
            'active_ministry_ids.*' => ['integer'],
            'wants_other_ministry' => ['required', 'boolean'],
            'other_ministry_ids' => ['nullable', 'array'],
            'other_ministry_ids.*' => ['integer'],
            'gifts_to_develop' => ['nullable', 'string', 'max:5000'],
            'professional_area' => ['nullable', 'string', 'max:5000'],
            'lgpd_data_consent' => ['required', 'boolean'],
            'redirect_after_save' => ['nullable', 'string', 'max:80'],
            'current_password' => ['required_with:password', 'current_password'],
            'password' => ['nullable', 'string', 'confirmed', Password::defaults()],
        ], UserProfilePhotoResolver::validationRules(required: ! $hasExistingPhoto)), [
            'birth_date.before_or_equal' => 'O voluntário deve ter pelo menos 10 anos de idade.',
        ]);

        VolunteerSignupName::assertValidInPayload($validated);

        if (! $hasExistingPhoto && ! $request->hasFile('photo_file')) {
            throw ValidationException::withMessages([
                'photo_file' => ['Tire ou envie uma foto antes de salvar.'],
            ]);
        }

        if (($validated['is_official_member'] ?? false) === true) {
            if (! array_key_exists('member_record_at_nova_semente', $validated) || $validated['member_record_at_nova_semente'] === null) {
                throw ValidationException::withMessages([
                    'member_record_at_nova_semente' => ['Informe se o seu registro de membro está na Nova Semente.'],
                ]);
            }
            if ($validated['member_record_at_nova_semente'] === false) {
                $church = trim((string) ($validated['member_record_church'] ?? ''));
                if ($church === '') {
                    throw ValidationException::withMessages([
                        'member_record_church' => ['Informe em qual igreja está o seu registro de membro.'],
                    ]);
                }
            }
        }

        if (($validated['has_previous_ministry_volunteer_experience'] ?? false) === true) {
            $previousIds = $this->validateMinistryIdsForChurch(
                $validated['previous_ministry_ids'] ?? [],
                $churchId,
                'previous_ministry_ids'
            );
            if ($previousIds === []) {
                throw ValidationException::withMessages([
                    'previous_ministry_ids' => ['Selecione em quais ministérios você já serviu.'],
                ]);
            }
        } else {
            $previousIds = [];
        }

        if (($validated['is_active_in_ministry'] ?? false) === true) {
            $activeIds = $this->validateMinistryIdsForChurch(
                $validated['active_ministry_ids'] ?? [],
                $churchId,
                'active_ministry_ids'
            );
            if ($activeIds === []) {
                throw ValidationException::withMessages([
                    'active_ministry_ids' => ['Selecione pelo menos um ministério em que você é atuante.'],
                ]);
            }
        } else {
            $activeIds = [];
        }

        if (($validated['wants_other_ministry'] ?? false) === true) {
            $otherIds = $this->validateMinistryIdsForChurch(
                $validated['other_ministry_ids'] ?? [],
                $churchId,
                'other_ministry_ids'
            );
            if ($otherIds === []) {
                throw ValidationException::withMessages([
                    'other_ministry_ids' => ['Selecione pelo menos um ministério em que gostaria de servir.'],
                ]);
            }
        } else {
            $otherIds = [];
        }

        if (($validated['lgpd_data_consent'] ?? false) !== true) {
            throw ValidationException::withMessages([
                'lgpd_data_consent' => ['Para continuar, é necessário autorizar o uso dos dados conforme a LGPD.'],
            ]);
        }

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $existingOther = $emailNorm
            ? User::query()
                ->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])
                ->where('id', '!=', $user->id)
                ->first()
            : null;

        if ($msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($existingOther, $user->id)) {
            throw ValidationException::withMessages([
                'email' => [$msg],
            ]);
        }

        $validated['previous_ministry_ids'] = $previousIds;
        $validated['active_ministry_ids'] = $activeIds;
        $validated['other_ministry_ids'] = $otherIds;

        app(PersistVolunteerSignupQuestionnaire::class)(
            $user,
            $volunteer,
            $validated,
            $request,
            $churchId,
        );

        $completion = VolunteerSignupCompletion::forUser($user->fresh() ?? $user);

        if ($completion['is_complete']) {
            $redirectRoute = $this->resolveRedirectRoute($validated['redirect_after_save'] ?? null);

            return redirect()
                ->route($redirectRoute)
                ->with('status', 'Cadastro de voluntário concluído com sucesso.');
        }

        $pendingLabels = VolunteerSignupCompletion::describeMissingFields($completion['missing_fields']);

        return redirect()
            ->route('volunteers.self-signup.edit', ['missing' => 1])
            ->with(
                'status',
                $pendingLabels !== ''
                    ? "Respostas salvas. Ainda falta: {$pendingLabels}."
                    : 'Respostas salvas. Continue respondendo as perguntas pendentes.'
            );
    }

    public function autosave(Request $request, VolunteerSignupAutosave $autosave): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        $churchId = $this->resolveChurchId($user, $request);
        if ($churchId === null) {
            return response()->json([
                'message' => 'Não foi possível identificar a igreja do seu cadastro.',
            ], 422);
        }

        $this->normalizeSignupBooleans($request);

        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');
        $volunteer = $user->volunteerProfile;

        if ($volunteer === null) {
            return response()->json(['message' => 'Cadastro de voluntário não encontrado.'], 422);
        }

        $hasExistingPhoto = is_string($user->photo_url) && trim($user->photo_url) !== '';
        if (! $hasExistingPhoto && ! $request->hasFile('photo_file')) {
            $autosaveFields = $request->input('autosave_fields', []);
            if (is_array($autosaveFields) && in_array('photo_file', $autosaveFields, true)) {
                throw ValidationException::withMessages([
                    'photo_file' => ['Tire ou envie uma foto antes de salvar.'],
                ]);
            }
        }

        if ($request->hasFile('photo_file')) {
            $request->validate(UserProfilePhotoResolver::validationRules(required: ! $hasExistingPhoto));
        }

        $result = $autosave->mergeAndValidate($user, $request, $churchId);
        $validated = $result['validated'];

        $autosaveFields = $result['autosave_fields'];
        $nameInAutosave = count(array_intersect(['first_name', 'last_name'], $autosaveFields)) > 0;
        if ($nameInAutosave || $request->has('first_name') || $request->has('last_name')) {
            VolunteerSignupName::assertValidInPayload($validated);
        }

        $validated['previous_ministry_ids'] = $this->validateMinistryIdsForChurch(
            $validated['previous_ministry_ids'] ?? [],
            $churchId,
            'previous_ministry_ids'
        );
        $validated['active_ministry_ids'] = $this->validateMinistryIdsForChurch(
            $validated['active_ministry_ids'] ?? [],
            $churchId,
            'active_ministry_ids'
        );
        $validated['other_ministry_ids'] = $this->validateMinistryIdsForChurch(
            $validated['other_ministry_ids'] ?? [],
            $churchId,
            'other_ministry_ids'
        );

        app(PersistVolunteerSignupQuestionnaire::class)(
            $user,
            $volunteer,
            $validated,
            $request,
            $churchId,
        );

        $freshUser = $user->fresh() ?? $user;
        $completion = VolunteerSignupCompletion::forUser($freshUser);

        return response()->json([
            'message' => $completion['is_complete']
                ? 'Cadastro de voluntário concluído.'
                : 'Resposta salva.',
            'completion' => $completion,
            'initial' => VolunteerSignupFormPrefill::forUser($freshUser),
        ]);
    }

    private function resolveChurchId(User $user, Request $request): ?int
    {
        $churchId = (int) ($user->church_id ?? 0);
        if ($churchId > 0) {
            return $churchId;
        }

        $resolved = Church::resolveWorkingId($request);

        return $resolved !== null ? (int) $resolved : null;
    }

    private function resolveRedirectRoute(?string $candidate): string
    {
        $allowed = ['mobile.profile.edit', 'mobile.profile', 'profile.edit'];
        $name = trim((string) $candidate);
        if ($name !== '' && in_array($name, $allowed, true) && \Illuminate\Support\Facades\Route::has($name)) {
            return $name;
        }

        return 'mobile.profile.edit';
    }

    private function normalizeSignupBooleans(Request $request): void
    {
        $booleanFields = [
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'member_record_at_nova_semente',
            'has_previous_ministry_volunteer_experience',
            'is_active_in_ministry',
            'wants_other_ministry',
            'lgpd_data_consent',
        ];

        $merged = [];
        foreach ($booleanFields as $field) {
            if (! $request->has($field)) {
                continue;
            }
            $raw = $request->input($field);
            if ($raw === '' || $raw === null) {
                $merged[$field] = null;

                continue;
            }
            $merged[$field] = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        }

        if ($merged !== []) {
            $request->merge($merged);
        }
    }
}
