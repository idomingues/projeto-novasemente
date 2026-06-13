<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerSignupName;
use App\Support\VolunteerSignupServiceEaseAreas;
use App\Support\VolunteerSignupValidation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\Response as BaseResponse;

class VolunteerPublicSignupController extends Controller
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

    /**
     * Cadastro Voluntário público (sem token na URL): usa a primeira igreja ativa e o token guardado na base.
     */
    public function createPublicPage(): RedirectResponse|Response
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('login')->with('error', 'Cadastro de voluntários ainda não está disponível. Entre em contato a equipe.');
        }

        $church = Church::query()->where('active', true)->orderBy('name')->first();
        if (! $church) {
            return redirect()->route('login')->with('error', 'Nenhuma igreja ativa.');
        }

        $record = VolunteerSelfSignupToken::query()->firstOrCreate(
            ['church_id' => $church->id],
            ['token' => (string) Str::uuid()]
        );

        $ministries = Ministry::query()
            ->where('church_id', $church->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Volunteers/PublicSignup', [
            'token' => $record->token,
            'churchName' => $church->name,
            'ministries' => $ministries,
        ]);
    }

    /**
     * Verifica na saída do sobrenome se já existe nome completo semelhante cadastrado nesta igreja.
     */
    public function checkDuplicate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'first_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['nullable', 'string', 'max:155'],
            'email' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return response()->json(['duplicate' => false, 'email_taken' => false, 'phone_taken' => false]);
        }

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->first();
        if (! $record) {
            return response()->json(['duplicate' => false, 'email_taken' => false, 'phone_taken' => false, 'invalid_token' => true]);
        }

        // Recadastro permitido: não bloquear por nome já existente.
        $nameDup = false;

        // O recadastro deve ser permitido com o mesmo e-mail.
        $emailTaken = false;
        $emailMessage = null;

        // Recadastro permitido: não bloquear por telefone já existente.
        $phoneTaken = false;
        $phoneMessage = null;

        return response()->json([
            'duplicate' => $nameDup,
            'email_taken' => $emailTaken,
            'phone_taken' => $phoneTaken,
            'message' => null,
            'email_message' => $emailMessage,
            'phone_message' => $phoneMessage,
            'invalid_token' => false,
        ]);
    }

    public function create(Request $request): RedirectResponse|Response
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.home')->with('error', 'Cadastro público de voluntários ainda não está disponível. Entre em contato a equipe.');
        }

        $token = (string) $request->query('token', '');
        if ($token === '') {
            return redirect()->route('mobile.home')->with('error', 'Link de cadastro inválido.');
        }

        $record = VolunteerSelfSignupToken::query()->where('token', $token)->first();
        if (! $record) {
            return redirect()->route('mobile.home')->with('error', 'Link de cadastro inválido ou desatualizado.');
        }

        $church = Church::query()->find($record->church_id);
        if (! $church) {
            return redirect()->route('mobile.home')->with('error', 'Igreja não encontrada.');
        }

        $ministries = Ministry::query()
            ->where('church_id', $record->church_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Volunteers/PublicSignup', [
            'token' => $token,
            'churchName' => $church->name,
            'ministries' => $ministries,
        ]);
    }

    public function store(Request $request): RedirectResponse|BaseResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.home')->with('error', 'Cadastro público indisponível.');
        }

        $this->normalizeSignupBooleans($request);

        $minBirthDate = now()->subYears(10)->toDateString();

        $validated = $request->validate(array_merge(
            VolunteerSignupValidation::publicSignupRules($request, $minBirthDate),
            [
                'token' => ['required', 'string'],
                'password' => ['required', 'confirmed', Password::defaults()],
            ],
            UserProfilePhotoResolver::validationRules()
        ), [
            'birth_date.before_or_equal' => 'O voluntário deve ter pelo menos 10 anos de idade.',
        ]);

        VolunteerSignupName::assertValidInPayload($validated);
        VolunteerSignupValidation::assertConditionalRules($validated);

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();
        $churchId = (int) $record->church_id;

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        $name = trim($validated['first_name'].' '.$validated['last_name']);

        $existingUser = $emailNorm
            ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
            : null;

        if ($msg = VolunteerContactDuplicateChecker::privilegedAccountVolunteerLinkMessage($existingUser, $request->user()?->id)) {
            throw ValidationException::withMessages([
                'email' => [$msg],
            ]);
        }

        $user = DB::transaction(function () use (
            $validated,
            $name,
            $record,
            $emailNorm,
            $existingUser,
            $photoUrl,
        ) {
            $user = User::withoutEvents(function () use ($validated, $name, $record, $existingUser, $emailNorm, $photoUrl) {
                if ($existingUser) {
                    $existingUser->forceFill([
                        'name' => $name,
                        'email' => $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail($validated['email']),
                        'password' => $validated['password'],
                        'photo_url' => $photoUrl ?? $existingUser->photo_url,
                    ]);
                    if (! $existingUser->church_id) {
                        $existingUser->church_id = $record->church_id;
                    }
                    $existingUser->save();

                    return $existingUser;
                }

                return User::create([
                    'name' => $name,
                    'email' => $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail($validated['email']),
                    'password' => $validated['password'],
                    'church_id' => $record->church_id,
                    'photo_url' => $photoUrl,
                ]);
            });

            $guard = (string) config('auth.defaults.guard');
            if (Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->syncRoles(['membro']);
            } else {
                $user->syncRoles([]);
            }
            $user->ministries()->detach();
            $user->syncRoleIdFromSpatieAssignments();
            $user->forceFill(['is_volunteer' => true])->save();
            $user->syncVolunteerRecord();
            $this->linkPreRegisteredVolunteerRecord($user);
            $user->load('volunteerProfile');

            $volunteer = $user->volunteerProfile;
            if ($volunteer) {
                $hasSocialNetworks = (bool) ($validated['has_social_networks'] ?? false);
                $volunteer->forceFill([
                    'phone' => $validated['phone'] ?? null,
                    'birth_date' => $validated['birth_date'],
                    'has_whatsapp' => (bool) $validated['has_whatsapp'],
                    'has_social_networks' => $hasSocialNetworks,
                    'social_network_profiles' => $hasSocialNetworks
                        ? ($validated['social_network_profiles'] ?? null)
                        : null,
                    'professional_area' => $validated['professional_area'] ?? null,
                    'attendance_duration' => (string) $validated['attendance_duration'],
                    'is_official_member' => (bool) $validated['is_official_member'],
                    'volunteer_phase' => (string) $validated['volunteer_phase'],
                    'service_ease_areas' => VolunteerSignupServiceEaseAreas::encode($validated['service_ease_areas'] ?? []),
                    'comfortable_with_digital_tools' => (bool) $validated['comfortable_with_digital_tools'],
                    'service_greatest_strength' => $validated['service_greatest_strength'] ?? null,
                    'service_greatest_challenge' => $validated['service_greatest_challenge'] ?? null,
                    'needs_pastoral_guidance' => false,
                    'lgpd_data_consent' => (bool) $validated['lgpd_data_consent'],
                ])->save();
                VolunteerPipelineBootstrap::setInteressadoStageForVolunteer(
                    $volunteer->fresh(),
                    (int) $record->church_id
                );
            }

            $user->syncVolunteerRecord();

            return $user->fresh();
        });

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $persisted = $emailNorm !== null
            ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
            : null;

        if ($persisted === null || trim((string) ($persisted->email ?? '')) === '') {
            return redirect()
                ->route('volunteers.public-signup.page')
                ->with(
                    'error',
                    'Não foi possível concluir o cadastro da conta de acesso. Tente enviar o formulário novamente ou entre em contato com a equipe.'
                );
        }

        $this->ensureVolunteerLoginReady($persisted);

        $welcomeMessage =
            'Bem-vindo! Seu cadastro de voluntário foi concluído. Faça login com o e-mail e a senha que você definiu para acessar o aplicativo.';

        $request->session()->flash('status', $welcomeMessage);
        $request->session()->flash('volunteer_signup_welcome', true);

        if ($request->user()) {
            Auth::guard('web')->logout();
        }

        return $this->redirectToLoginAfterVolunteerSignup($request);
    }

    public function welcome(Request $request): RedirectResponse
    {
        if (! $request->session()->pull('volunteer_signup_completed', false)) {
            return redirect()->route('volunteers.public-signup.page');
        }

        $status = $request->session()->get('status');
        if (is_string($status) && $status !== '') {
            $request->session()->flash('status', $status);
        }
        $request->session()->flash('volunteer_signup_welcome', true);

        return redirect()->route('login');
    }

    private function redirectToLoginAfterVolunteerSignup(Request $request): RedirectResponse|BaseResponse
    {
        $loginUrl = route('login');

        if ($request->header('X-Inertia')) {
            return Inertia::location($loginUrl);
        }

        return redirect()->to($loginUrl);
    }

    /**
     * FormData envia booleanos como "0"/"1"; normaliza antes da validação Laravel.
     */
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

    /**
     * Garante vínculo voluntário ↔ usuário após o cadastro (evita reabrir o formulário público).
     */
    private function ensureVolunteerLoginReady(User $user): void
    {
        $user->forceFill(['is_volunteer' => true])->save();
        $user->syncVolunteerRecord();
        $user->unsetRelation('volunteerProfile');
        $user->load('volunteerProfile');

        $volunteer = $user->volunteerProfile
            ?? Volunteer::query()->where('user_id', $user->id)->first();

        if ($volunteer === null) {
            return;
        }

        if ($volunteer->user_id === null) {
            $volunteer->forceFill(['user_id' => $user->id])->save();
            $volunteer = $volunteer->fresh();
        }

        if ($volunteer !== null) {
            VolunteerAppLogin::syncLoginEmailFromVolunteer($user->fresh() ?? $user, $volunteer);
        }
    }

    /**
     * Liga a conta nova a um registro em `volunteers` criado pela equipe (mesmo e-mail, sem user_id).
     */
    private function linkPreRegisteredVolunteerRecord(User $user): void
    {
        $email = strtolower(trim((string) ($user->email ?? '')));
        if ($email === '') {
            return;
        }

        $user->load('volunteerProfile');
        $current = $user->volunteerProfile;

        $preRegisteredQuery = Volunteer::query()
            ->whereRaw('lower(trim(COALESCE(email, ""))) = ?', [$email])
            ->whereNull('user_id')
            ->orderByDesc('id');

        if ($current !== null) {
            $preRegisteredQuery->where('id', '!=', $current->id);
        }

        $preRegistered = $preRegisteredQuery->first();
        if ($preRegistered === null) {
            return;
        }

        if ($current !== null) {
            Volunteer::query()
                ->where('user_id', $user->id)
                ->where('id', '!=', $preRegistered->id)
                ->update(['user_id' => null]);
        }

        $name = trim((string) ($preRegistered->name ?? ''));
        if ($name === '') {
            $name = trim((string) ($user->name ?? ''));
        }

        $preRegistered->forceFill([
            'user_id' => $user->id,
            'name' => $name !== '' ? $name : ($user->name ?? 'Voluntário'),
            'email' => $user->email,
        ])->save();

        VolunteerAppLogin::syncLoginEmailFromVolunteer($user, $preRegistered);

        if ($current !== null && $current->id !== $preRegistered->id) {
            $current->delete();
        }
    }

    /**
     * Gera novo token (invalida o link anterior).
     */
    public function rotateToken(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('volunteers.index')->with(
                'error',
                'Execute as migrations na base de dados: php artisan migrate (tabela volunteer_self_signup_tokens).'
            );
        }

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return redirect()->route('volunteers.index')->with('error', 'Selecione uma igreja para gerar o link.');
        }

        $row = VolunteerSelfSignupToken::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()]
        );
        $row->forceFill(['token' => (string) Str::uuid()])->save();

        $url = route('volunteers.self-signup', ['token' => $row->token], absolute: true);

        return redirect()->route('volunteers.index')
            ->with('success', 'Novo link de cadastro público gerado.')
            ->with('public_volunteer_signup_url', $url)
            ->with('public_volunteer_signup_church', Church::query()->whereKey($churchId)->value('name'));
    }
}
