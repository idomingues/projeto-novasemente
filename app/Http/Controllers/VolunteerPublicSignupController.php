<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
            'previous_ministry_details' => ['nullable', 'string', 'max:2000'],
            'ministry_involvement' => ['nullable', 'string', 'max:5000'],
            'other_ministry_interest' => ['required', 'string', 'max:5000'],
            'gifts_to_develop' => ['nullable', 'string', 'max:5000'],
            'professional_area' => ['nullable', 'string', 'max:5000'],
            'needs_pastoral_guidance' => ['required', 'boolean'],
            'lgpd_data_consent' => ['required', 'boolean'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['integer'],
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

        if (($validated['has_previous_ministry_volunteer_experience'] ?? false) === true) {
            $details = trim((string) ($validated['previous_ministry_details'] ?? ''));
            if ($details === '') {
                throw ValidationException::withMessages([
                    'previous_ministry_details' => ['Descreva em quais ministérios você já serviu e o que mais gostava ao servir.'],
                ]);
            }
        }

        if (($validated['lgpd_data_consent'] ?? false) !== true) {
            throw ValidationException::withMessages([
                'lgpd_data_consent' => ['Para continuar, é necessário autorizar o uso dos dados conforme a LGPD.'],
            ]);
        }

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);

        $rawMinistryIds = $validated['ministry_ids'] ?? [];
        $ministryIds = is_array($rawMinistryIds)
            ? array_values(array_unique(array_map('intval', $rawMinistryIds)))
            : [];
        if ($ministryIds !== []) {
            $allowedCount = Ministry::query()
                ->where('church_id', $record->church_id)
                ->whereIn('id', $ministryIds)
                ->count();

            if ($allowedCount !== count($ministryIds)) {
                throw ValidationException::withMessages([
                    'ministry_ids' => ['Selecione apenas departamentos válidos desta igreja.'],
                ]);
            }
        }

        $name = trim($validated['first_name'].' '.$validated['last_name']);

        $user = DB::transaction(function () use ($validated, $name, $ministryIds, $record, $emailNorm) {
            $existingUser = $emailNorm
                ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
                : null;

            $user = User::withoutEvents(function () use ($validated, $name, $record, $existingUser, $emailNorm) {
                if ($existingUser) {
                    $existingUser->forceFill([
                        'name' => $name,
                        'email' => $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail($validated['email']),
                        'password' => $validated['password'],
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
                ]);
            });

            $guard = (string) config('auth.defaults.guard');
            if (Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
            $user->syncRoleIdFromSpatieAssignments();
            $user->ensureVolunteerProfile();
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
                    'previous_ministry_details' => $validated['previous_ministry_details'] ?? null,
                    'ministry_involvement' => $validated['ministry_involvement'] ?? null,
                    'other_ministry_interest' => $validated['other_ministry_interest'] ?? null,
                    'gifts_to_develop' => $validated['gifts_to_develop'] ?? null,
                    'professional_area' => $validated['professional_area'] ?? null,
                    'needs_pastoral_guidance' => (bool) $validated['needs_pastoral_guidance'],
                    'lgpd_data_consent' => (bool) $validated['lgpd_data_consent'],
                ])->save();
                if ($ministryIds !== []) {
                    $volunteer->ministries()->sync($ministryIds);
                    $added = collect($ministryIds)->map(fn ($id) => (int) $id)->filter(fn ($id) => $id > 0)->values()->all();
                    if ($added !== []) {
                        app(VolunteerMinistryRosterNotifier::class)->notifyLeadersOfNewAttachments($volunteer->fresh(), $added);
                    }
                }
                VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer->fresh(), (int) $record->church_id);
            }

            $user->forceFill(['is_volunteer' => true])->save();
            $user->ensureVolunteerProfile();

            return $user->fresh();
        });

        return redirect()
            ->route('login')
            ->with(
                'status',
                'Parabéns! Seu cadastro de voluntário foi concluído com sucesso. Entre com seu e-mail e senha para acessar o aplicativo.'
            );
    }

    /**
     * Liga a conta nova a um registro em `volunteers` criado pela equipe (mesmo e-mail, sem user_id).
     */
    private function linkPreRegisteredVolunteerRecord(User $user): void
    {
        $user->load('volunteerProfile');
        $current = $user->volunteerProfile;
        if ($current === null) {
            return;
        }

        $email = strtolower(trim((string) ($user->email ?? '')));
        if ($email === '') {
            return;
        }

        $preRegistered = Volunteer::query()
            ->where('id', '!=', $current->id)
            ->whereRaw('lower(trim(COALESCE(email, ""))) = ?', [$email])
            ->whereNull('user_id')
            ->orderByDesc('id')
            ->first();

        if ($preRegistered === null) {
            return;
        }

        Volunteer::query()
            ->where('user_id', $user->id)
            ->where('id', '!=', $preRegistered->id)
            ->update(['user_id' => null]);

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

        $current->delete();
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
