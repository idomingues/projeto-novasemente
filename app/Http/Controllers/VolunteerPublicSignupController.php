<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\StorageUrl;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class VolunteerPublicSignupController extends Controller
{
    private function storeUserPhoto(UploadedFile $file): string
    {
        $path = $file->store('users/photos', 'public');

        return StorageUrl::publicMediaUrl($path);
    }

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

    public function store(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.home')->with('error', 'Cadastro público indisponível.');
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'photo_file' => ['required', 'image', 'max:4096'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:155'],
            'birth_date' => ['required', 'date'],
            'has_whatsapp' => ['required', 'boolean'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
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
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

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

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();
        $churchId = (int) $record->church_id;

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

        $previousMinistryDetails = ($validated['has_previous_ministry_volunteer_experience'] ?? false)
            ? $this->ministryNamesForChurch($previousIds, $churchId)
            : null;
        $ministryInvolvement = ($validated['is_active_in_ministry'] ?? false)
            ? $this->ministryNamesForChurch($activeIds, $churchId)
            : 'Não';
        $otherMinistryInterest = ($validated['wants_other_ministry'] ?? false)
            ? $this->ministryNamesForChurch($otherIds, $churchId)
            : 'Não';

        $ministryIds = array_values(array_unique(array_merge($activeIds, $otherIds)));

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $photoUrl = $request->hasFile('photo_file')
            ? $this->storeUserPhoto($request->file('photo_file'))
            : null;

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
            $ministryIds,
            $record,
            $emailNorm,
            $existingUser,
            $photoUrl,
            $previousMinistryDetails,
            $ministryInvolvement,
            $otherMinistryInterest,
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
                $volunteer->forceFill([
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
                    'needs_pastoral_guidance' => false,
                    'lgpd_data_consent' => (bool) $validated['lgpd_data_consent'],
                ])->save();
                if ($ministryIds !== []) {
                    $volunteer->ministries()->sync($ministryIds);
                    $added = collect($ministryIds)->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->values()->all();
                    if ($added !== []) {
                        app(VolunteerMinistryRosterNotifier::class)->notifyLeadersOfNewAttachments($volunteer->fresh(), $added);
                    }
                }
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

        $persisted->load('volunteerProfile');
        $volunteerRecord = $persisted->volunteerProfile
            ?? Volunteer::query()->where('user_id', $persisted->id)->first();

        if ($volunteerRecord === null || ! VolunteerAppLogin::loginReady($volunteerRecord)) {
            return redirect()
                ->route('volunteers.public-signup.page')
                ->with(
                    'error',
                    'Cadastro salvo, mas a conta de login ficou incompleta. Tente concluir o cadastro novamente com o mesmo e-mail.'
                );
        }

        $welcomeMessage =
            'Bem-vindo! Seu cadastro de voluntário foi concluído. Faça login com o e-mail e a senha que você definiu para acessar o aplicativo.';

        return redirect()
            ->route('login')
            ->with('status', $welcomeMessage)
            ->with('volunteer_signup_welcome', true);
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
