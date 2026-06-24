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
use App\Support\VolunteerSignupValidation;
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
            return redirect()->route('mobile.home')->with(
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
            'redirectAfterSave' => 'mobile.home',
            'focusMissingOnly' => $focusMissingOnly,
            'missingFields' => $focusMissingOnly ? $completion['missing_fields'] : [],
            'signupCompletion' => $completion,
            'resumePage' => $this->resolveResumePageFromQuery($request),
            'existingRegistrationNotice' => true,
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

        $validated = $request->validate(array_merge(
            VolunteerSignupValidation::baseRules($user, $request, $minBirthDate),
            [
                'current_password' => ['required_with:password', 'current_password'],
                'password' => ['nullable', 'string', 'confirmed', Password::defaults()],
            ],
            UserProfilePhotoResolver::validationRules(required: ! $hasExistingPhoto)
        ), [
            'birth_date.before_or_equal' => 'O voluntário deve ter pelo menos 10 anos de idade.',
        ]);

        VolunteerSignupName::assertValidInPayload($validated);

        if (! $hasExistingPhoto && ! $request->hasFile('photo_file')) {
            throw ValidationException::withMessages([
                'photo_file' => ['Tire ou envie uma foto antes de salvar.'],
            ]);
        }

        VolunteerSignupValidation::assertConditionalRules($validated);

        $validated['desired_ministry_ids'] = VolunteerSignupValidation::normalizeMinistryIdsForChurch(
            is_array($validated['desired_ministry_ids'] ?? null) ? $validated['desired_ministry_ids'] : [],
            $churchId,
            'desired_ministry_ids',
        );

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

        $redirectParams = [];
        if ($request->boolean('focus_missing_only')) {
            $redirectParams['missing'] = 1;
        }
        $resumePage = (int) $request->input('resume_page', -1);
        if ($resumePage >= 0 && $resumePage <= 2) {
            $redirectParams['etapa'] = $resumePage + 1;
        }

        return redirect()
            ->route('volunteers.self-signup.edit', $redirectParams)
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

        $validated['desired_ministry_ids'] = VolunteerSignupValidation::normalizeMinistryIdsForChurch(
            is_array($validated['desired_ministry_ids'] ?? null) ? $validated['desired_ministry_ids'] : [],
            $churchId,
            'desired_ministry_ids',
        );

        $autosaveFields = $result['autosave_fields'];
        $nameInAutosave = count(array_intersect(['first_name', 'last_name'], $autosaveFields)) > 0;
        if ($nameInAutosave || $request->has('first_name') || $request->has('last_name')) {
            VolunteerSignupName::assertValidInPayload($validated);
        }

        if (
            trim((string) ($validated['first_name'] ?? '')) !== ''
            && trim((string) ($validated['last_name'] ?? '')) !== ''
            && ($request->has('first_name') || $request->has('last_name'))
        ) {
            foreach (['first_name', 'last_name'] as $nameField) {
                if (! in_array($nameField, $autosaveFields, true)) {
                    $autosaveFields[] = $nameField;
                }
            }
            $request->merge(['autosave_fields' => $autosaveFields]);
        }

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
        $allowed = ['mobile.home', 'mobile.profile.edit', 'mobile.profile', 'profile.edit'];
        $name = trim((string) $candidate);
        if ($name !== '' && in_array($name, $allowed, true) && \Illuminate\Support\Facades\Route::has($name)) {
            return $name;
        }

        return 'mobile.home';
    }

    private function resolveResumePageFromQuery(Request $request): ?int
    {
        if (! $request->has('etapa')) {
            return null;
        }

        $etapa = (int) $request->query('etapa');
        if ($etapa >= 1 && $etapa <= 3) {
            return $etapa - 1;
        }

        return null;
    }

    private function normalizeSignupBooleans(Request $request): void
    {
        $booleanFields = [
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'comfortable_with_digital_tools',
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
