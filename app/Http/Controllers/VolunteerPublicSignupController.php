<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\ApplyVolunteerSignupMinistryIntent;
use App\Actions\Volunteers\RequestVolunteerNewDepartment;
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
use App\Support\VolunteerSignupIdentity;
use App\Support\VolunteerSignupName;
use App\Support\VolunteerSignupServiceEaseAreas;
use App\Support\VolunteerSignupServiceActivityTypes;
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
    public function createPublicPage(Request $request): RedirectResponse|Response
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

        return $this->renderSignupEntry($request, (string) $record->token, $church, $ministries);
    }

    /**
     * Verifica na saída do sobrenome / e-mail se já existe cadastro de voluntário.
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

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email'] ?? null);
        $identity = $emailNorm
            ? VolunteerSignupIdentity::resolve($emailNorm, $request->user()?->id)
            : ['status' => 'new', 'has_app_account' => false, 'message' => null];

        $existing = ($identity['status'] ?? '') === 'existing';
        $privileged = ($identity['status'] ?? '') === 'privileged';
        $hasApp = (bool) ($identity['has_app_account'] ?? false);

        return response()->json([
            'duplicate' => false,
            // Só bloqueia o formulário público quando já tem conta no app (deve ir às opções).
            'email_taken' => $privileged || ($existing && $hasApp),
            'phone_taken' => false,
            'already_volunteer' => $existing,
            'has_app_account' => $hasApp,
            'privileged' => $privileged,
            'message' => $privileged
                ? ($identity['message'] ?? 'Este e-mail não pode ser usado neste cadastro.')
                : ($existing && $hasApp
                    ? 'Você já possui cadastro de voluntário. Escolha atualizar ou pedir um novo departamento.'
                    : null),
            'email_message' => $privileged
                ? ($identity['message'] ?? null)
                : ($existing && $hasApp
                    ? 'Você já possui cadastro de voluntário com este e-mail.'
                    : null),
            'phone_message' => null,
            'invalid_token' => false,
            'existing_options_url' => ($existing && $hasApp)
                ? route('volunteers.self-signup.existing', ['token' => $validated['token']], absolute: false)
                : null,
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

        return $this->renderSignupEntry($request, $token, $church, $ministries);
    }

    /**
     * Confirma e-mail no início: novo segue o formulário; já voluntário vai às opções.
     */
    public function identify(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.home')->with('error', 'Cadastro público indisponível.');
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
        ]);

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->first();
        if (! $record) {
            return back()->withErrors(['token' => 'Link de cadastro inválido ou desatualizado.']);
        }

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        if ($emailNorm === null) {
            return back()->withErrors(['email' => 'Informe um e-mail válido.']);
        }

        $identity = VolunteerSignupIdentity::resolve($emailNorm, $request->user()?->id);

        $request->session()->put('volunteer_signup_token', $validated['token']);
        $request->session()->put('volunteer_signup_email', $emailNorm);
        $request->session()->put('volunteer_signup_identity', $identity['status']);
        $request->session()->put('volunteer_signup_has_app', (bool) $identity['has_app_account']);

        // Sempre mostra a situação + o que fazer, antes do formulário ou das ações.
        return redirect()->route('volunteers.self-signup.existing', ['token' => $validated['token']]);
    }

    /**
     * Formulário completo — só após identificação como novo (ou pré-cadastro sem conta no app).
     */
    public function showForm(Request $request): RedirectResponse|Response
    {
        [$token, $church, $ministries] = $this->resolveSignupTokenContext($request);

        $sessionEmail = VolunteerContactDuplicateChecker::normalizeEmail(
            (string) $request->session()->get('volunteer_signup_email', '')
        );
        $sessionIdentity = (string) $request->session()->get('volunteer_signup_identity', '');
        $hasApp = (bool) $request->session()->get('volunteer_signup_has_app', false);

        if ($sessionEmail === null || $sessionEmail === '') {
            return redirect()->route('volunteers.self-signup', ['token' => $token])
                ->with('info', 'Informe seu e-mail para continuar.');
        }

        if ($sessionIdentity === 'existing' && $hasApp) {
            return redirect()->route('volunteers.self-signup.existing', ['token' => $token]);
        }

        if ($sessionIdentity === 'privileged') {
            return redirect()->route('volunteers.self-signup.existing', ['token' => $token]);
        }

        // Pré-cadastro sem app: permite concluir o acesso (liga ao registro existente).
        if ($sessionIdentity === 'existing' && ! $hasApp) {
            // continua no formulário
        } elseif ($sessionIdentity !== 'new') {
            return redirect()->route('volunteers.self-signup', ['token' => $token]);
        }

        return Inertia::render('Volunteers/PublicSignup', [
            'token' => $token,
            'churchName' => $church->name,
            'ministries' => $ministries,
            'prefillEmail' => $sessionEmail,
            'completingPreRegistration' => $sessionIdentity === 'existing' && ! $hasApp,
        ]);
    }

    /**
     * Após o e-mail: explica a situação e sugere o próximo passo.
     */
    public function existingOptions(Request $request): RedirectResponse|Response
    {
        [$token, $church] = $this->resolveSignupTokenContext($request, includeMinistries: false);

        $authUser = $request->user();
        if ($authUser !== null) {
            $email = VolunteerContactDuplicateChecker::normalizeEmail($authUser->email) ?? '';
            // Situação da própria sessão: não usar actingUserId (bloqueio de «própria conta de equipe»).
            $identity = VolunteerSignupIdentity::resolve($email, null);

            $request->session()->put('volunteer_signup_token', $token);
            $request->session()->put('volunteer_signup_email', $email);
            $request->session()->put('volunteer_signup_identity', $identity['status']);
            $request->session()->put('volunteer_signup_has_app', (bool) $identity['has_app_account']);

            return Inertia::render(
                'Volunteers/SignupExistingOptions',
                $this->situationPageProps(
                    $token,
                    $church->name,
                    $email,
                    $identity,
                    isAuthenticated: true,
                )
            );
        }

        $sessionEmail = VolunteerContactDuplicateChecker::normalizeEmail(
            (string) $request->session()->get('volunteer_signup_email', '')
        );
        $sessionIdentity = (string) $request->session()->get('volunteer_signup_identity', '');
        $hasApp = (bool) $request->session()->get('volunteer_signup_has_app', false);

        if ($sessionEmail === null || $sessionEmail === '') {
            return redirect()->route('volunteers.self-signup', ['token' => $token])
                ->with('info', 'Informe seu e-mail para identificar sua situação.');
        }

        $identity = [
            'status' => in_array($sessionIdentity, ['new', 'existing', 'privileged'], true)
                ? $sessionIdentity
                : 'new',
            'has_app_account' => $hasApp,
            'message' => $sessionIdentity === 'privileged'
                ? 'Este e-mail não pode ser usado neste cadastro de voluntário. Use outro e-mail.'
                : null,
            'user' => null,
            'volunteer' => null,
        ];

        // Revalida a situação pelo e-mail (fonte da verdade).
        $fresh = VolunteerSignupIdentity::resolve($sessionEmail, null);
        $identity = $fresh;
        $request->session()->put('volunteer_signup_identity', $fresh['status']);
        $request->session()->put('volunteer_signup_has_app', (bool) $fresh['has_app_account']);

        return Inertia::render(
            'Volunteers/SignupExistingOptions',
            $this->situationPageProps(
                $token,
                $church->name,
                $sessionEmail,
                $identity,
                isAuthenticated: false,
            )
        );
    }

    public function requestDepartmentForm(Request $request): RedirectResponse|Response
    {
        $user = $request->user();
        if ($user === null) {
            $token = (string) $request->query('token', $request->session()->get('volunteer_signup_token', ''));

            return redirect()->route('login', [
                'redirect' => route('volunteers.self-signup.request-department', ['token' => $token], false),
            ]);
        }

        [$token, $church, $ministries] = $this->resolveSignupTokenContext($request);

        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');
        $volunteer = $user->volunteerProfile;
        if ($volunteer === null) {
            return redirect()->route('volunteers.self-signup', ['token' => $token])
                ->with('error', 'Cadastro de voluntário não encontrado.');
        }

        $churchId = (int) $church->id;
        $attachedIds = $volunteer->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $available = $ministries
            ->filter(fn ($m) => ! in_array((int) $m->id, $attachedIds, true))
            ->values()
            ->all();

        return Inertia::render('Volunteers/SignupRequestDepartment', [
            'token' => $token,
            'churchName' => $church->name,
            'ministries' => $available,
            'attachedMinistryNames' => $ministries
                ->filter(fn ($m) => in_array((int) $m->id, $attachedIds, true))
                ->pluck('name')
                ->values()
                ->all(),
            'storeUrl' => route('volunteers.self-signup.request-department.store'),
            'backUrl' => route('volunteers.self-signup.existing', ['token' => $token], absolute: false),
        ]);
    }

    public function storeRequestDepartment(Request $request, RequestVolunteerNewDepartment $action): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'ministry_ids' => ['required', 'array', 'min:1'],
            'ministry_ids.*' => ['integer'],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();
        $churchId = (int) $record->church_id;

        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');
        $volunteer = $user->volunteerProfile;
        abort_unless($volunteer !== null, 404);

        $ministryIds = $this->validateMinistryIdsForChurch(
            $validated['ministry_ids'],
            $churchId,
            'ministry_ids',
        );

        $action($volunteer, $churchId, $ministryIds, (string) $validated['reason'], $user);

        return redirect()
            ->route('mobile.home')
            ->with('success', 'Pedido de novo departamento enviado. A equipe vai analisar e entrar em contato.');
    }

    public function store(Request $request): RedirectResponse|BaseResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.home')->with('error', 'Cadastro público indisponível.');
        }

        if ($redirect = $this->redirectLoggedInVolunteerAwayFromPublicStore($request)) {
            return $redirect;
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

        $validated['desired_ministry_ids'] = VolunteerSignupValidation::normalizeMinistryIdsForChurch(
            is_array($validated['desired_ministry_ids'] ?? null) ? $validated['desired_ministry_ids'] : [],
            $churchId,
            'desired_ministry_ids',
        );

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        $name = trim($validated['first_name'].' '.$validated['last_name']);

        $identity = $emailNorm
            ? VolunteerSignupIdentity::resolve($emailNorm, $request->user()?->id)
            : ['status' => 'new', 'has_app_account' => false, 'message' => null, 'user' => null, 'volunteer' => null];

        if (($identity['status'] ?? '') === 'privileged') {
            throw ValidationException::withMessages([
                'email' => [$identity['message'] ?? 'Este e-mail não pode ser usado neste cadastro.'],
            ]);
        }

        // Já voluntário com conta no app: não cria outro cadastro nem sobrescreve a senha.
        if (($identity['status'] ?? '') === 'existing' && ($identity['has_app_account'] ?? false)) {
            $request->session()->put('volunteer_signup_token', $validated['token']);
            $request->session()->put('volunteer_signup_email', $emailNorm);
            $request->session()->put('volunteer_signup_identity', 'existing');
            $request->session()->put('volunteer_signup_has_app', true);

            return redirect()
                ->route('volunteers.self-signup.existing', ['token' => $validated['token']])
                ->with(
                    'info',
                    'Você já possui cadastro de voluntário. Atualize seus dados ou peça um novo departamento — sem preencher tudo de novo.'
                );
        }

        $existingUser = $identity['user'] ?? ($emailNorm
            ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
            : null);

        $user = DB::transaction(function () use (
            $validated,
            $name,
            $record,
            $churchId,
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
                    'service_activity_types' => VolunteerSignupServiceActivityTypes::encode($validated['service_activity_types'] ?? []),
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

                if (($validated['desired_ministry_ids'] ?? []) !== []) {
                    app(ApplyVolunteerSignupMinistryIntent::class)(
                        $volunteer->fresh(),
                        $validated['desired_ministry_ids'],
                        $churchId,
                        $user,
                    );
                }
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
     * Usuário logado com cadastro de voluntário não deve reenviar o formulário público.
     */
    private function redirectLoggedInVolunteerAwayFromPublicStore(Request $request): ?RedirectResponse
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        $user->ensureVolunteerProfile();
        $user->load('volunteerProfile');

        if ($user->volunteerProfile === null && ! $user->is_volunteer) {
            return null;
        }

        $token = (string) $request->input('token', $request->session()->get('volunteer_signup_token', ''));
        if ($token === '') {
            return redirect()
                ->route('volunteers.self-signup.edit')
                ->with('info', 'Você já possui cadastro de voluntário. Atualize suas informações abaixo.');
        }

        return redirect()
            ->route('volunteers.self-signup.existing', ['token' => $token])
            ->with(
                'info',
                'Você já possui cadastro de voluntário. Escolha atualizar o cadastro ou pedir um novo departamento.'
            );
    }

    /**
     * Props da tela «situação identificada» com a ação sugerida.
     *
     * @param  array{status: string, has_app_account: bool, message: ?string}  $identity
     * @return array<string, mixed>
     */
    private function situationPageProps(
        string $token,
        string $churchName,
        string $email,
        array $identity,
        bool $isAuthenticated,
    ): array {
        $status = (string) ($identity['status'] ?? 'new');
        $hasApp = (bool) ($identity['has_app_account'] ?? false);
        $changeEmailUrl = route('volunteers.self-signup', ['token' => $token], absolute: false);
        $loginUrl = route('login', [
            'redirect' => route('volunteers.self-signup.existing', ['token' => $token], false),
        ], absolute: false);

        if ($status === 'privileged') {
            return [
                'token' => $token,
                'churchName' => $churchName,
                'email' => $email,
                'status' => 'privileged',
                'hasAppAccount' => false,
                'isAuthenticated' => $isAuthenticated,
                'situationTitle' => 'E-mail não disponível',
                'situationSummary' => $identity['message'] ?? 'Este e-mail não pode ser usado neste cadastro de voluntário.',
                'suggestedAction' => 'Troque o e-mail e tente de novo. Contas da equipe ou de líder não entram por este link.',
                'primaryActionLabel' => 'Usar outro e-mail',
                'primaryActionUrl' => $changeEmailUrl,
                'secondaryActionLabel' => null,
                'secondaryActionUrl' => null,
                'loginUrl' => $loginUrl,
                'changeEmailUrl' => $changeEmailUrl,
            ];
        }

        if ($status === 'new') {
            $formUrl = route('volunteers.self-signup.form', ['token' => $token], absolute: false);

            return [
                'token' => $token,
                'churchName' => $churchName,
                'email' => $email,
                'status' => 'new',
                'hasAppAccount' => false,
                'isAuthenticated' => $isAuthenticated,
                'situationTitle' => 'Nenhum cadastro encontrado',
                'situationSummary' => 'Não encontramos voluntário com este e-mail.',
                'suggestedAction' => 'Próximo passo sugerido: começar o cadastro de voluntário e criar o acesso ao aplicativo.',
                'primaryActionLabel' => 'Começar cadastro novo',
                'primaryActionUrl' => $formUrl,
                'secondaryActionLabel' => null,
                'secondaryActionUrl' => null,
                'loginUrl' => $loginUrl,
                'changeEmailUrl' => $changeEmailUrl,
            ];
        }

        // existing
        if (! $hasApp) {
            $formUrl = route('volunteers.self-signup.form', ['token' => $token], absolute: false);

            return [
                'token' => $token,
                'churchName' => $churchName,
                'email' => $email,
                'status' => 'existing',
                'hasAppAccount' => false,
                'isAuthenticated' => $isAuthenticated,
                'situationTitle' => 'Pré-cadastro encontrado',
                'situationSummary' => 'Você já aparece como voluntário, mas ainda falta a conta de acesso ao app.',
                'suggestedAction' => 'Próximo passo sugerido: concluir o acesso e atualizar os dados no mesmo cadastro — sem criar outro.',
                'primaryActionLabel' => 'Concluir acesso e atualizar',
                'primaryActionUrl' => $formUrl,
                'secondaryActionLabel' => 'Pedir novo departamento (depois do acesso)',
                'secondaryActionUrl' => $formUrl,
                'loginUrl' => $loginUrl,
                'changeEmailUrl' => $changeEmailUrl,
            ];
        }

        $updateUrl = $isAuthenticated
            ? route('volunteers.self-signup.edit', absolute: false)
            : route('login', ['redirect' => route('volunteers.self-signup.edit', absolute: false)], absolute: false);
        $requestDeptUrl = $isAuthenticated
            ? route('volunteers.self-signup.request-department', ['token' => $token], absolute: false)
            : route('login', [
                'redirect' => route('volunteers.self-signup.request-department', ['token' => $token], false),
            ], absolute: false);

        return [
            'token' => $token,
            'churchName' => $churchName,
            'email' => $email,
            'status' => 'existing',
            'hasAppAccount' => true,
            'isAuthenticated' => $isAuthenticated,
            'situationTitle' => 'Você já é voluntário',
            'situationSummary' => 'Encontramos seu cadastro com este e-mail. Não é preciso preencher tudo de novo.',
            'suggestedAction' => $isAuthenticated
                ? 'Escolha: atualizar seus dados ou pedir um novo departamento.'
                : 'Faça login no app e depois atualize o cadastro ou peça um novo departamento.',
            'primaryActionLabel' => 'Atualizar cadastro',
            'primaryActionUrl' => $updateUrl,
            'secondaryActionLabel' => 'Pedir novo departamento',
            'secondaryActionUrl' => $requestDeptUrl,
            'loginUrl' => $loginUrl,
            'changeEmailUrl' => $changeEmailUrl,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Ministry>|null  $ministries
     */
    private function renderSignupEntry(
        Request $request,
        string $token,
        Church $church,
        $ministries = null,
    ): RedirectResponse|Response {
        $request->session()->put('volunteer_signup_token', $token);

        $user = $request->user();
        if ($user !== null) {
            $email = VolunteerContactDuplicateChecker::normalizeEmail($user->email) ?? '';
            if ($email !== '') {
                // Situação da própria sessão: não usar actingUserId.
                $identity = VolunteerSignupIdentity::resolve($email, null);
                $request->session()->put('volunteer_signup_email', $email);
                $request->session()->put('volunteer_signup_identity', $identity['status']);
                $request->session()->put('volunteer_signup_has_app', (bool) $identity['has_app_account']);

                return redirect()->route('volunteers.self-signup.existing', ['token' => $token]);
            }
        }

        $request->session()->forget([
            'volunteer_signup_email',
            'volunteer_signup_identity',
            'volunteer_signup_has_app',
        ]);

        return Inertia::render('Volunteers/SignupIdentify', [
            'token' => $token,
            'churchName' => $church->name,
            'identifyUrl' => route('volunteers.self-signup.identify'),
        ]);
    }

    /**
     * @return array{0: string, 1: Church, 2: \Illuminate\Support\Collection<int, Ministry>}
     */
    private function resolveSignupTokenContext(Request $request, bool $includeMinistries = true): array
    {
        $token = (string) $request->query(
            'token',
            (string) $request->input('token', $request->session()->get('volunteer_signup_token', ''))
        );

        if ($token === '') {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                redirect()->route('mobile.home')->with('error', 'Link de cadastro inválido.')
            );
        }

        $record = VolunteerSelfSignupToken::query()->where('token', $token)->first();
        if (! $record) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                redirect()->route('mobile.home')->with('error', 'Link de cadastro inválido ou desatualizado.')
            );
        }

        $church = Church::query()->find($record->church_id);
        if (! $church) {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(
                redirect()->route('mobile.home')->with('error', 'Igreja não encontrada.')
            );
        }

        $request->session()->put('volunteer_signup_token', $token);

        $ministries = $includeMinistries
            ? Ministry::query()
                ->where('church_id', $record->church_id)
                ->orderBy('name')
                ->get(['id', 'name'])
            : collect();

        return [$token, $church, $ministries];
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
