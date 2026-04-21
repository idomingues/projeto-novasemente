<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Users\Actions\SyncUserChurchFromRegistration;
use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Http\Controllers\Controller;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(Request $request): Response
    {
        $invitation = null;
        $token = $request->query('invitation');
        if ($token) {
            $invitation = Invitation::where('token', $token)->with('user')->first();
            if ($invitation && ! $invitation->isValid()) {
                $invitation = null;
            }
        }

        $churchId = Church::resolveWorkingId($request);
        $ministryOptions = [];
        if ($churchId !== null) {
            $ministryOptions = Ministry::query()
                ->where('church_id', $churchId)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Ministry $m) => ['id' => (int) $m->id, 'name' => (string) $m->name])
                ->values()
                ->all();
        }

        return Inertia::render('Auth/Register', [
            'invitation' => $invitation ? [
                'email' => $invitation->email,
                'name' => $invitation->user?->name,
                'role' => $invitation->role,
                'token' => $invitation->token,
                'completes_existing_user' => $invitation->user_id !== null,
            ] : null,
            'ministryOptions' => $ministryOptions,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->filled('invitation_token')) {
            $invitation = Invitation::where('token', $request->invitation_token)->first();
            if ($invitation && $invitation->isValid() && $invitation->user_id) {
                return $this->storeCompletingInvitedUser($request, $invitation);
            }
        }

        $churchIdForRegister = Church::resolveWorkingId($request);
        $ministryIdRules = ['integer'];
        if ($churchIdForRegister !== null) {
            $ministryIdRules[] = Rule::exists('ministries', 'id')->where('church_id', $churchIdForRegister);
        } else {
            $ministryIdRules[] = 'exists:ministries,id';
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'invitation_token' => ['nullable', 'string'],
            'already_volunteer' => ['sometimes', 'boolean'],
            'volunteer_ministry_ids' => ['nullable', 'array'],
            'volunteer_ministry_ids.*' => $ministryIdRules,
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ]);

        $user = User::withoutEvents(function () use ($request) {
            return User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => $request->password,
                'notify_via_app' => $request->boolean('notify_via_app'),
                'notify_via_email' => $request->boolean('notify_via_email'),
                'notify_via_whatsapp' => $request->boolean('notify_via_whatsapp'),
                'lgpd_accepted_at' => now(),
            ]);
        });

        if ($request->filled('invitation_token')) {
            $invitation = Invitation::where('token', $request->invitation_token)->first();
            if ($invitation && $invitation->isValid() && $invitation->email === $request->email) {
                $invitation->update(['used_at' => now()]);
                if ($invitation->role) {
                    $user->assignRole($invitation->role);
                }
            }
        }

        if ($user->getRoleNames()->isEmpty()) {
            $guard = (string) config('auth.defaults.guard');
            if (Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
        }

        $user->syncRoleIdFromSpatieAssignments();

        $user->ensureVolunteerProfile();

        if ($request->boolean('already_volunteer')) {
            $this->applyAlreadyVolunteerOnPublicRegister($user);
        }

        app(SyncUserChurchFromRegistration::class)($user, $request);
        $this->applyRegistrationVolunteerDepartments($request, $user);
        $user->ensureVolunteerProfile();

        event(new Registered($user));

        Auth::login($user);

        $request->session()->flash('registration_success', true);
        $request->session()->flash('success', 'Conta criada com sucesso. Bem-vindo(a)!');

        return redirect()->route('registration.welcome');
    }

    /**
     * Quem marca «Já sou voluntário» indica em que departamentos serve (para a escala).
     */
    private function applyRegistrationVolunteerDepartments(Request $request, User $user): void
    {
        if (! $request->boolean('already_volunteer')) {
            return;
        }

        $user->load('volunteerProfile');
        $volunteer = $user->volunteerProfile;
        if ($volunteer === null) {
            return;
        }

        $churchId = (int) ($user->church_id ?? 0);
        if ($churchId === 0) {
            $resolved = Church::resolveWorkingId($request);
            $churchId = $resolved !== null ? (int) $resolved : 0;
        }

        if ($churchId === 0) {
            return;
        }

        if (Ministry::query()->where('church_id', $churchId)->exists()) {
            $submitted = $request->input('volunteer_ministry_ids', []);
            $nonEmpty = is_array($submitted)
                ? count(array_filter($submitted, fn ($v) => (int) $v > 0))
                : 0;
            if ($nonEmpty < 1) {
                throw ValidationException::withMessages([
                    'volunteer_ministry_ids' => 'Selecione pelo menos um departamento em que serve.',
                ]);
            }
        }

        $ids = collect($request->input('volunteer_ministry_ids', []))
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $allowed = Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $ids)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($ids !== [] && count($allowed) !== count($ids)) {
            throw ValidationException::withMessages([
                'volunteer_ministry_ids' => 'Um ou mais departamentos são inválidos para esta igreja.',
            ]);
        }

        app(SyncVolunteerMinistryAttachments::class)($volunteer, $allowed);

        if ($allowed !== []) {
            $user->forceFill(['is_volunteer' => true])->save();
        }
    }

    /**
     * Utilizador marcou «Já sou voluntário»: liga a um registo existente em `volunteers` pelo e-mail (sem conta) ou marca o perfil para equipe.
     */
    private function applyAlreadyVolunteerOnPublicRegister(User $user): void
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

        if ($preRegistered !== null) {
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

            $current->delete();

            return;
        }

        $current->forceFill([
            'app_access_only' => false,
            'role' => trim((string) ($current->role ?? '')) !== '' ? $current->role : 'Voluntário',
        ])->save();
    }

    private function storeCompletingInvitedUser(Request $request, Invitation $invitation): RedirectResponse
    {
        $user = User::query()->findOrFail($invitation->user_id);

        if ($user->email !== null) {
            return redirect()->route('login')->with('status', 'Este cadastro já foi concluído. Faça login com seu e-mail.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = $validated['password'];
        $user->notify_via_app = $request->boolean('notify_via_app');
        $user->notify_via_email = $request->boolean('notify_via_email');
        $user->notify_via_whatsapp = $request->boolean('notify_via_whatsapp');
        $user->lgpd_accepted_at = now();
        $user->save();

        $invitation->update(['used_at' => now()]);
        if ($invitation->role) {
            $user->assignRole($invitation->role);
        }

        if ($user->getRoleNames()->isEmpty()) {
            $guard = (string) config('auth.defaults.guard');
            if (Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
        }

        $user->syncRoleIdFromSpatieAssignments();

        $user->ensureVolunteerProfile();

        app(SyncUserChurchFromRegistration::class)($user, $request);
        $user->ensureVolunteerProfile();

        Auth::login($user);

        $request->session()->flash('registration_success', true);
        $request->session()->flash('success', 'Conta criada com sucesso. Bem-vindo(a)!');

        return redirect()->route('registration.welcome');
    }

    /**
     * Ecrã de confirmação após registo (utilizador já autenticado).
     */
    public function welcome(Request $request): RedirectResponse|Response
    {
        if (! $request->session()->pull('registration_success', false)) {
            return redirect()->route('mobile.news');
        }

        return Inertia::render('Auth/RegistrationWelcome');
    }
}
