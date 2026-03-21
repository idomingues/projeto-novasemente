<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\VolunteerSelfSignupToken;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerPublicSignupController extends Controller
{
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
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'phone' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'ministry_id' => ['required', 'exists:ministries,id'],
        ]);

        $record = VolunteerSelfSignupToken::query()->where('token', $validated['token'])->firstOrFail();
        $ministry = Ministry::query()->findOrFail((int) $validated['ministry_id']);

        if ($ministry->church_id !== $record->church_id) {
            abort(403);
        }

        $name = trim($validated['first_name'].' '.$validated['last_name']);

        $user = DB::transaction(function () use ($validated, $name, $ministry) {
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
                ])->save();
                $volunteer->ministries()->sync([$ministry->id]);
            }

            return $user;
        });

        Auth::login($user);

        return redirect()->route('dashboard')->with('success', 'Cadastro concluído! Bem-vindo como voluntário.');
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
