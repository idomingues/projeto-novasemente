<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\LeaderSelfSignupToken;
use App\Models\Ministry;
use App\Models\User;
use App\Support\MemberRoleAssignment;
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

class LeaderPublicSignupController extends Controller
{
    public function create(Request $request): RedirectResponse|Response
    {
        if (! Schema::hasTable('leader_self_signup_tokens')) {
            return redirect()->route('login')->with('error', 'Cadastro de líderes ainda não está disponível. Entre em contato a equipe.');
        }

        $token = (string) $request->query('token', '');
        if ($token === '') {
            return redirect()->route('login')->with('error', 'Link de cadastro inválido.');
        }

        $record = LeaderSelfSignupToken::query()->where('token', $token)->first();
        if (! $record) {
            return redirect()->route('login')->with('error', 'Link de cadastro inválido ou desatualizado.');
        }

        $church = Church::query()->find($record->church_id);
        if (! $church) {
            return redirect()->route('login')->with('error', 'Igreja não encontrada.');
        }

        $ministries = Ministry::query()
            ->where('church_id', $record->church_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Leaders/PublicSignup', [
            'token' => $token,
            'churchName' => $church->name,
            'ministries' => $ministries,
        ]);
    }

    public function checkEmail(Request $request): JsonResponse
    {
        if (! Schema::hasTable('leader_self_signup_tokens')) {
            return response()->json(['email_taken' => false, 'invalid_token' => true]);
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
        ]);

        $record = LeaderSelfSignupToken::query()->where('token', $validated['token'])->first();
        if (! $record) {
            return response()->json(['email_taken' => false, 'invalid_token' => true]);
        }

        $emailNorm = strtolower(trim($validated['email']));
        $taken = User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->exists();

        return response()->json([
            'email_taken' => $taken,
            'invalid_token' => false,
            'message' => $taken ? 'Este e-mail já está registrado.' : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('leader_self_signup_tokens')) {
            return redirect()->route('login')->with('error', 'Cadastro indisponível.');
        }

        $validated = $request->validate([
            'token' => ['required', 'string'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Password::defaults()],
            'ministry_ids' => ['required', 'array', 'min:1'],
            'ministry_ids.*' => ['integer'],
        ]);

        $record = LeaderSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();

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

        $guard = (string) config('auth.defaults.guard');

        DB::transaction(function () use ($validated, $ministryIds, $record) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'church_id' => $record->church_id,
                'is_ministry_leader' => true,
            ]);

            $user->ministries()->sync($ministryIds);
            MemberRoleAssignment::applyMinistryLeaderRole($user->fresh());
            $user->ensureVolunteerProfile();
        });

        return redirect()->route('login')
            ->with('status', 'Cadastro concluído! Entre com seu e-mail e senha para acessar o sistema.');
    }

    public function rotateToken(Request $request): RedirectResponse
    {
        if (! Schema::hasTable('leader_self_signup_tokens')) {
            return back()->with(
                'error',
                'Execute as migrations: php artisan migrate (tabela leader_self_signup_tokens).'
            );
        }

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return back()->with('error', 'Selecione uma igreja para gerar o link.');
        }

        $row = LeaderSelfSignupToken::query()->firstOrCreate(
            ['church_id' => $churchId],
            ['token' => (string) Str::uuid()]
        );
        $row->forceFill(['token' => (string) Str::uuid()])->save();

        $url = route('leaders.self-signup', ['token' => $row->token], absolute: true);
        $churchName = Church::query()->whereKey($churchId)->value('name');

        return back()
            ->with('success', 'Novo link de cadastro de líderes gerado.')
            ->with('leader_self_signup_url', $url)
            ->with('leader_self_signup_church', $churchName);
    }
}
