<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Invitation;
use App\Models\LeaderSelfSignupToken;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        $search = trim((string) $request->query('search', ''));

        $users = collect();
        if ($churchId !== null) {
            $users = User::query()
                ->where('church_id', $churchId)
                ->with(['roles', 'ministries'])
                ->when($search !== '', function ($q) use ($search) {
                    $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
                    $q->where(function ($q2) use ($like) {
                        $q2->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like);
                    });
                })
                ->orderBy('name')
                ->get();
        }

        $invitations = collect();
        if ($churchId !== null) {
            $invitations = Invitation::query()
                ->with('user')
                ->where(function ($q) use ($churchId) {
                    $q->whereNull('user_id')
                        ->orWhereHas('user', fn ($uq) => $uq->where('church_id', $churchId));
                })
                ->orderByDesc('id')
                ->limit(100)
                ->get();
        }

        $guard = (string) config('auth.defaults.guard');
        $roles = Role::query()->where('guard_name', $guard)->orderBy('name')->get(['id', 'name']);

        $ministries = $churchId !== null
            ? Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])
            : collect();

        $leaderSelfSignupUrl = null;
        $leaderSelfSignupChurch = null;
        if ($churchId !== null && Schema::hasTable('leader_self_signup_tokens')) {
            $leaderSelfSignupUrl = LeaderSelfSignupToken::ensureSignupUrl($churchId);
            $leaderSelfSignupChurch = Church::query()->whereKey($churchId)->value('name');
        }

        $canManageUsers = $request->user()?->can('users.manage') ?? false;

        return Inertia::render('Users/Index', [
            'canManageUsers' => $canManageUsers,
            'users' => $users->map(function (User $u) {
                $email = $u->email;

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $email,
                    'needs_registration' => $email === null || trim((string) $email) === '',
                    'roles' => $u->getRoleNames()->values()->all(),
                    'ministry_ids' => $u->relationLoaded('ministries')
                        ? $u->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all()
                        : [],
                ];
            })->values()->all(),
            'invitations' => $invitations->map(function (Invitation $i) {
                $link = route('register', ['invitation' => $i->token], absolute: true);

                return [
                    'id' => $i->id,
                    'email' => $i->email,
                    'user_name' => $i->user?->name,
                    'role' => $i->role,
                    'token' => $i->token,
                    'expires_at' => $i->expires_at?->toIso8601String(),
                    'used_at' => $i->used_at?->toIso8601String(),
                    'link' => $link,
                ];
            })->values()->all(),
            'roles' => $roles->map(fn (Role $r) => ['id' => $r->id, 'name' => $r->name])->values()->all(),
            'ministries' => $ministries->map(fn (Ministry $m) => ['id' => $m->id, 'name' => $m->name])->values()->all(),
            'filters' => [
                'search' => $search,
            ],
            'leaderSelfSignupUrl' => $leaderSelfSignupUrl,
            'leaderSelfSignupChurch' => $leaderSelfSignupChurch,
        ]);
    }

    public function store(Request $request)
    {
        $valid = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'confirmed', Password::defaults(), Rule::requiredIf(fn () => $request->filled('email'))],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
        ]);

        $passwordPlain = $valid['password'] ?? null;

        $churchId = Church::resolveWorkingId($request);

        $user = User::create([
            'name' => $valid['name'],
            'email' => $valid['email'] ?? null,
            'password' => $passwordPlain ?? Str::random(64),
            'church_id' => $churchId,
        ]);

        if (! empty($valid['role'])) {
            $user->assignRole($valid['role']);
        }
        $user->syncRoleIdFromSpatieAssignments();

        if (($valid['role'] ?? '') === 'lider_ministerio' && ! empty($valid['ministry_ids'])) {
            $user->ministries()->sync($valid['ministry_ids']);
        }

        $user->ensureVolunteerProfile();

        return redirect()->route('users.index')->with('success', 'Usuário criado com sucesso.');
    }

    public function update(Request $request, User $user)
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
        ];
        if ($request->filled('password')) {
            $rules['password'] = ['required', 'confirmed', Password::defaults()];
        }
        $valid = $request->validate($rules);

        $user->name = $valid['name'];
        $user->email = $valid['email'] ?? null;
        if (! empty($valid['password'])) {
            $user->password = $valid['password'];
        }
        $user->save();

        $user->syncRoles($valid['role'] ? [$valid['role']] : []);
        $user->syncRoleIdFromSpatieAssignments();

        if (($valid['role'] ?? '') === 'lider_ministerio') {
            $user->ministries()->sync($valid['ministry_ids'] ?? []);
        } else {
            $user->ministries()->detach();
        }

        $user->ensureVolunteerProfile();

        return redirect()->route('users.index')->with('success', 'Usuário atualizado.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'Não pode excluir o próprio usuário.');
        }
        $user->delete();

        return redirect()->route('users.index')->with('success', 'Usuário removido.');
    }

    public function invite(User $user): RedirectResponse
    {
        if ($user->email !== null) {
            return redirect()->route('users.index')->with('error', 'Este usuário já possui e-mail. Para convidar por link, use um cadastro apenas com nome ou remova o e-mail antes.');
        }

        Invitation::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        $token = Invitation::createToken();

        Invitation::create([
            'user_id' => $user->id,
            'email' => null,
            'token' => $token,
            'role' => null,
            'expires_at' => now()->addDays(7),
        ]);

        $link = route('register', ['invitation' => $token], true);

        return redirect()->route('users.index')
            ->with('success', 'Convite criado. Encaminhe o link para a pessoa finalizar o cadastro (e-mail e senha).')
            ->with('invitation_link', $link);
    }
}
