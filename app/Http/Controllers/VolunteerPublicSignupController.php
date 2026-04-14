<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerSelfSignupToken;
use App\Support\VolunteerContactDuplicateChecker;
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

class VolunteerPublicSignupController extends Controller
{
    /**
     * Cadastro Voluntário público (sem token na URL): usa a primeira igreja ativa e o token guardado na base.
     */
    public function createPublicPage(): RedirectResponse|Response
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('login')->with('error', 'Cadastro de voluntários ainda não está disponível. Contacte a equipa.');
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
            'churchLogoUrl' => $church->logo_url,
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

        $churchId = $record->church_id;

        $nameDup = false;
        $fn = isset($validated['first_name']) ? trim((string) $validated['first_name']) : '';
        $ln = isset($validated['last_name']) ? trim((string) $validated['last_name']) : '';
        if ($fn !== '' && $ln !== '') {
            $normalized = $this->normalizedFullName($fn, $ln);
            if (mb_strlen($normalized) >= 3) {
                $memberDup = Member::query()
                    ->where('church_id', $churchId)
                    ->whereRaw('LOWER(TRIM(COALESCE(name, ""))) = ?', [$normalized])
                    ->exists();

                $userDup = User::query()
                    ->whereRaw('LOWER(TRIM(COALESCE(name, ""))) = ?', [$normalized])
                    ->exists();

                $volunteerDup = Volunteer::query()
                    ->where(function ($q) use ($normalized, $churchId) {
                        $q->whereHas('member', function ($m) use ($normalized, $churchId) {
                            $m->where('church_id', $churchId)
                                ->whereRaw('LOWER(TRIM(COALESCE(members.name, ""))) = ?', [$normalized]);
                        })->orWhere(function ($q) use ($normalized, $churchId) {
                            $q->whereNull('member_id')
                                ->whereHas('ministries', fn ($m) => $m->where('church_id', $churchId))
                                ->whereRaw('LOWER(TRIM(COALESCE(volunteers.name, ""))) = ?', [$normalized]);
                        });
                    })
                    ->exists();

                $nameDup = $memberDup || $userDup || $volunteerDup;
            }
        }

        $emailTaken = false;
        $emailMessage = null;
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail(isset($validated['email']) ? (string) $validated['email'] : null);
        if ($emailNorm !== null) {
            if (User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->exists()) {
                $emailTaken = true;
                $emailMessage = 'Este e-mail já está registado.';
            } elseif ($msg = VolunteerContactDuplicateChecker::emailConflictsMemberVolunteerForChurch($churchId, $emailNorm)) {
                $emailTaken = true;
                $emailMessage = $msg;
            }
        }

        $phoneTaken = false;
        $phoneMessage = null;
        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone(isset($validated['phone']) ? (string) $validated['phone'] : null);
        if ($phoneNorm !== null) {
            if ($msg = VolunteerContactDuplicateChecker::phoneConflictsForChurch($churchId, $phoneNorm)) {
                $phoneTaken = true;
                $phoneMessage = $msg;
            }
        }

        $dup = $nameDup || $emailTaken || $phoneTaken;

        return response()->json([
            'duplicate' => $nameDup,
            'email_taken' => $emailTaken,
            'phone_taken' => $phoneTaken,
            'message' => $nameDup ? 'Já existe um cadastro com este nome completo nesta igreja. Verifique os dados ou contacte a secretaria.' : null,
            'email_message' => $emailMessage,
            'phone_message' => $phoneMessage,
            'invalid_token' => false,
        ]);
    }

    private function normalizedFullName(string $first, string $last): string
    {
        $t = trim($first.' '.$last);

        return mb_strtolower(preg_replace('/\s+/u', ' ', $t));
    }

    public function create(Request $request): RedirectResponse|Response
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.culto')->with('error', 'Cadastro público de voluntários ainda não está disponível. Contacte a equipa.');
        }

        $token = (string) $request->query('token', '');
        if ($token === '') {
            return redirect()->route('mobile.culto')->with('error', 'Link de cadastro inválido.');
        }

        $record = VolunteerSelfSignupToken::query()->where('token', $token)->first();
        if (! $record) {
            return redirect()->route('mobile.culto')->with('error', 'Link de cadastro inválido ou desatualizado.');
        }

        $church = Church::query()->find($record->church_id);
        if (! $church) {
            return redirect()->route('mobile.culto')->with('error', 'Igreja não encontrada.');
        }

        $ministries = Ministry::query()
            ->where('church_id', $record->church_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Volunteers/PublicSignup', [
            'token' => $token,
            'churchName' => $church->name,
            'churchLogoUrl' => $church->logo_url,
            'ministries' => $ministries,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('volunteer_self_signup_tokens')) {
            return redirect()->route('mobile.culto')->with('error', 'Cadastro público indisponível.');
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:155'],
            'birth_date' => ['required', 'date'],
            'has_whatsapp' => ['required', 'boolean'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
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
            'needs_pastoral_guidance' => ['required', 'boolean'],
            'lgpd_data_consent' => ['required', 'boolean'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'ministry_ids' => ['required', 'array', 'min:1'],
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
        if ($emailNorm !== null) {
            if ($msg = VolunteerContactDuplicateChecker::emailConflictsMemberVolunteerForChurch($record->church_id, $emailNorm)) {
                throw ValidationException::withMessages(['email' => [$msg]]);
            }
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone($validated['phone'] ?? null);
        if ($phoneNorm !== null) {
            if ($msg = VolunteerContactDuplicateChecker::phoneConflictsForChurch($record->church_id, $phoneNorm)) {
                throw ValidationException::withMessages(['phone' => [$msg]]);
            }
        }

        $ministryIds = array_values(array_unique(array_map('intval', $validated['ministry_ids'])));
        $allowedCount = Ministry::query()
            ->where('church_id', $record->church_id)
            ->whereIn('id', $ministryIds)
            ->count();

        if ($allowedCount !== count($ministryIds)) {
            throw ValidationException::withMessages([
                'ministry_ids' => ['Selecione apenas departamentos válidos desta igreja.'],
            ]);
        }

        $name = trim($validated['first_name'].' '.$validated['last_name']);

        $user = DB::transaction(function () use ($validated, $name, $ministryIds) {
            $user = User::create([
                'name' => $name,
                'email' => $validated['email'],
                'password' => $validated['password'],
                'member_id' => null,
            ]);

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
                    'needs_pastoral_guidance' => (bool) $validated['needs_pastoral_guidance'],
                    'lgpd_data_consent' => (bool) $validated['lgpd_data_consent'],
                ])->save();
                $volunteer->ministries()->sync($ministryIds);
            }

            return $user;
        });

        return redirect('/login')
            ->with('status', 'Cadastro concluído! Agora entre com seu e-mail e senha.');
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
