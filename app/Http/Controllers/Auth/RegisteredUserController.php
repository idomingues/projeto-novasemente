<?php

namespace App\Http\Controllers\Auth;

use App\Domain\Users\Actions\SyncUserChurchFromRegistration;
use App\Http\Controllers\Controller;
use App\Models\Church;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Support\UserProfilePhotoResolver;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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

        $ministryVolunteerInvite = null;
        if ($invitation === null) {
            $ministryInviteToken = $request->query('ministry_invite_token');
            if (is_string($ministryInviteToken) && $ministryInviteToken !== '') {
                $inv = VolunteerMinistryInvitation::query()
                    ->where('token', $ministryInviteToken)
                    ->with(['volunteer:id,name,email,phone,user_id', 'ministry:id,name'])
                    ->first();
                $v = $inv?->volunteer;
                $em = trim((string) ($v?->email ?? ''));
                if (
                    $inv
                    && ! $inv->isExpired()
                    && $inv->status === 'pending'
                    && $v
                    && $v->user_id === null
                    && $em !== ''
                ) {
                    $ministryVolunteerInvite = [
                        'token' => (string) $inv->token,
                        'email' => $em,
                        'name' => $v->name,
                        'phone' => is_string($v->phone) && trim($v->phone) !== '' ? trim($v->phone) : null,
                        'ministryName' => $inv->ministry?->name,
                        'ministryId' => (int) $inv->ministry_id,
                    ];
                }
            }
        }

        if ($ministryVolunteerInvite !== null) {
            $queryEmail = $request->query('email');
            $canonical = strtolower(trim((string) $ministryVolunteerInvite['email']));
            $queryNorm = is_string($queryEmail) ? strtolower(trim($queryEmail)) : '';
            if ($queryNorm !== $canonical) {
                return redirect()->route('register', [
                    'ministry_invite_token' => $ministryVolunteerInvite['token'],
                    'email' => $ministryVolunteerInvite['email'],
                ]);
            }
        }

        return Inertia::render('Auth/Register', [
            'invitation' => $invitation ? [
                'email' => $invitation->email,
                'name' => $invitation->user?->name,
                'role' => $invitation->role,
                'token' => $invitation->token,
                'completes_existing_user' => $invitation->user_id !== null,
            ] : null,
            'ministryVolunteerInvite' => $ministryVolunteerInvite,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        if ($request->filled('ministry_invite_token')) {
            return $this->storeWithVolunteerMinistryInvite($request);
        }

        if ($request->filled('invitation_token')) {
            $invitation = Invitation::where('token', $request->invitation_token)->first();
            if ($invitation && $invitation->isValid() && $invitation->user_id) {
                return $this->storeCompletingInvitedUser($request, $invitation);
            }
        }

        $request->validate(array_merge([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'invitation_token' => ['nullable', 'string'],
            'ministry_invite_token' => ['nullable', 'string'],
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ], UserProfilePhotoResolver::validationRules()));

        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        $user = User::withoutEvents(function () use ($request, $photoUrl) {
            return User::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => trim((string) $request->phone),
                'password' => $request->password,
                'photo_url' => $photoUrl,
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

        app(SyncUserChurchFromRegistration::class)($user, $request);
        $user->ensureVolunteerProfile();

        event(new Registered($user));

        Auth::login($user);

        $request->session()->flash('registration_success', true);
        $request->session()->flash('success', 'Conta criada com sucesso. Bem-vindo(a)!');

        return redirect()->route('registration.welcome');
    }

    private function storeWithVolunteerMinistryInvite(Request $request): RedirectResponse
    {
        $invite = VolunteerMinistryInvitation::query()
            ->where('token', (string) $request->input('ministry_invite_token', ''))
            ->with(['volunteer', 'ministry'])
            ->first();

        if (! $invite || $invite->isExpired() || $invite->status !== 'pending') {
            throw ValidationException::withMessages([
                'ministry_invite_token' => 'Convite inválido, expirado ou já respondido.',
            ]);
        }

        $volunteer = $invite->volunteer;
        $ministry = $invite->ministry;
        if (! $volunteer || ! $ministry) {
            throw ValidationException::withMessages([
                'ministry_invite_token' => 'Convite inválido.',
            ]);
        }

        if ($volunteer->user_id !== null) {
            throw ValidationException::withMessages([
                'ministry_invite_token' => 'Este voluntário já está associado a uma conta. Faça login para continuar.',
            ]);
        }

        $volunteerEmail = strtolower(trim((string) ($volunteer->email ?? '')));
        if ($volunteerEmail === '') {
            throw ValidationException::withMessages([
                'email' => 'O cadastro de voluntário não tem e-mail. Entre em contato a secretaria.',
            ]);
        }

        $request->validate(array_merge([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:'.User::class,
                function (string $attribute, mixed $value, \Closure $fail) use ($volunteerEmail): void {
                    if (strtolower(trim((string) $value)) !== $volunteerEmail) {
                        $fail('O e-mail tem de ser o mesmo indicado no cadastro de voluntário do convite.');
                    }
                },
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'phone' => ['required', 'string', 'max:50'],
            'ministry_invite_token' => ['required', 'string'],
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ], UserProfilePhotoResolver::validationRules()));

        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        $request->session()->put('working_church_id', (int) $invite->church_id);

        $user = DB::transaction(function () use ($request, $invite, $volunteer, $ministry, $photoUrl) {
            $user = User::withoutEvents(function () use ($request, $photoUrl) {
                return User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => trim((string) $request->phone),
                    'password' => $request->password,
                    'photo_url' => $photoUrl,
                    'notify_via_app' => $request->boolean('notify_via_app'),
                    'notify_via_email' => $request->boolean('notify_via_email'),
                    'notify_via_whatsapp' => $request->boolean('notify_via_whatsapp'),
                    'lgpd_accepted_at' => now(),
                ]);
            });

            $volunteer->refresh();

            $displayName = trim((string) $request->name);
            if ($displayName === '') {
                $displayName = trim((string) ($volunteer->name ?? ''));
            }
            if ($displayName === '') {
                $displayName = 'Voluntário';
            }

            $volunteer->forceFill([
                'user_id' => $user->id,
                'name' => $displayName,
                'email' => strtolower(trim((string) $request->email)),
                'phone' => trim((string) $request->phone),
            ])->save();

            if (Schema::hasTable('ministry_volunteer')) {
                $volunteer->ministries()->syncWithoutDetaching([(int) $ministry->id]);
            }

            $invite->forceFill([
                'status' => 'accepted',
                'accepted_at' => now(),
            ])->save();

            return $user;
        });

        if ($user->getRoleNames()->isEmpty()) {
            $guard = (string) config('auth.defaults.guard');
            if (Role::query()->where('name', 'membro')->where('guard_name', $guard)->exists()) {
                $user->assignRole('membro');
            }
        }

        $user->syncRoleIdFromSpatieAssignments();

        $user->ensureVolunteerProfile();

        $user->forceFill([
            'is_volunteer' => true,
        ])->save();

        app(SyncUserChurchFromRegistration::class)($user, $request);
        $user->ensureVolunteerProfile();

        event(new Registered($user));

        Auth::login($user);

        $request->session()->flash('registration_success', true);
        $request->session()->flash('success', 'Conta criada e convite aceite. Bem-vindo(a)!');

        return redirect()->route('registration.welcome');
    }

    private function storeCompletingInvitedUser(Request $request, Invitation $invitation): RedirectResponse
    {
        $user = User::query()->findOrFail($invitation->user_id);

        if ($user->email !== null) {
            return redirect()->route('login')->with('status', 'Este cadastro já foi concluído. Faça login com seu e-mail.');
        }

        $validated = $request->validate(array_merge([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'notify_via_app' => ['required', 'boolean'],
            'notify_via_email' => ['required', 'boolean'],
            'notify_via_whatsapp' => ['required', 'boolean'],
            'lgpd_accepted' => ['required', 'accepted'],
        ], UserProfilePhotoResolver::validationRules()));

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->phone = trim((string) $validated['phone']);
        $user->password = $validated['password'];
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request, $user->photo_url);
        if ($photoUrl !== null) {
            $user->photo_url = $photoUrl;
        }
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
     * Tela de confirmação após registro (usuário já autenticado).
     */
    public function welcome(Request $request): RedirectResponse|Response
    {
        if (! $request->session()->pull('registration_success', false)) {
            return redirect()->route('mobile.home');
        }

        return Inertia::render('Auth/RegistrationWelcome');
    }
}
