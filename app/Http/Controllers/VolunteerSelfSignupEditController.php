<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerSignupCompletion;
use App\Support\VolunteerSignupFormPrefill;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'last_name' => ['required', 'string', 'max:155'],
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

        $previousMinistryDetails = ($validated['has_previous_ministry_volunteer_experience'] ?? false)
            ? $this->ministryNamesForChurch($previousIds, $churchId)
            : null;
        $ministryInvolvement = ($validated['is_active_in_ministry'] ?? false)
            ? $this->ministryNamesForChurch($activeIds, $churchId)
            : 'Não';
        $otherMinistryInterest = ($validated['wants_other_ministry'] ?? false)
            ? $this->ministryNamesForChurch($otherIds, $churchId)
            : 'Não';

        $newMinistryIds = array_values(array_unique(array_merge($activeIds, $otherIds)));
        $existingMinistryIds = $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->all();
        $addedMinistryIds = array_values(array_diff($newMinistryIds, $existingMinistryIds));

        $name = trim($validated['first_name'].' '.$validated['last_name']);
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        DB::transaction(function () use (
            $user,
            $volunteer,
            $validated,
            $name,
            $emailNorm,
            $photoUrl,
            $previousMinistryDetails,
            $ministryInvolvement,
            $otherMinistryInterest,
            $newMinistryIds,
            $addedMinistryIds,
        ) {
            $user->forceFill([
                'name' => $name,
                'email' => $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail($validated['email']),
            ]);
            if (! empty($validated['password'])) {
                $user->password = $validated['password'];
            }
            if ($photoUrl !== null) {
                UserProfilePhotoResolver::deleteStoredUploadIfAny($user->photo_url);
                $user->photo_url = $photoUrl;
            }
            $user->forceFill(['is_volunteer' => true])->save();

            $volunteer->forceFill([
                'name' => $name,
                'email' => $user->email,
                'phone' => $validated['phone'] ?? null,
                'birth_date' => $validated['birth_date'],
                'has_whatsapp' => (bool) $validated['has_whatsapp'],
                'has_social_networks' => (bool) $validated['has_social_networks'],
                'attendance_duration' => (string) $validated['attendance_duration'],
                'is_official_member' => (bool) $validated['is_official_member'],
                'member_record_at_nova_semente' => array_key_exists('member_record_at_nova_semente', $validated)
                    ? (is_null($validated['member_record_at_nova_semente']) ? null : (bool) $validated['member_record_at_nova_semente'])
                    : null,
                'member_record_church' => $validated['member_record_church'] ?? null,
                'has_previous_ministry_volunteer_experience' => (bool) $validated['has_previous_ministry_volunteer_experience'],
                'previous_ministry_details' => $previousMinistryDetails,
                'ministry_involvement' => $ministryInvolvement,
                'other_ministry_interest' => $otherMinistryInterest,
                'gifts_to_develop' => $validated['gifts_to_develop'] ?? null,
                'professional_area' => $validated['professional_area'] ?? null,
                'lgpd_data_consent' => (bool) $validated['lgpd_data_consent'],
            ])->save();

            if ($newMinistryIds !== []) {
                $volunteer->ministries()->sync($newMinistryIds);
                if ($addedMinistryIds !== []) {
                    app(VolunteerMinistryRosterNotifier::class)->notifyLeadersOfNewAttachments(
                        $volunteer->fresh(),
                        $addedMinistryIds
                    );
                }
            } else {
                $volunteer->ministries()->detach();
            }

            $user->syncVolunteerRecord();
            VolunteerAppLogin::syncLoginEmailFromVolunteer($user->fresh() ?? $user, $volunteer->fresh());
        });

        $redirectRoute = $this->resolveRedirectRoute($validated['redirect_after_save'] ?? null);

        $statusMessage = VolunteerSignupCompletion::forUser($user->fresh() ?? $user)['is_complete']
            ? 'Cadastro de voluntário concluído com sucesso.'
            : 'Respostas salvas. Continue quando quiser em Editar perfil.';

        return redirect()
            ->route($redirectRoute)
            ->with('status', $statusMessage);
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
