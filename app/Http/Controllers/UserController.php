<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Invitation;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = (string) $request->input('search', '');

        $usersQuery = User::with(['member:id,name', 'roles', 'ministries:id,name']);

        if ($search !== '') {
            $usersQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('member', function ($mq) use ($search) {
                        $mq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $users = $usersQuery
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'member_id' => $u->member_id,
                'member' => $u->member ? ['id' => $u->member->id, 'name' => $u->member->name] : null,
                'roles' => $u->roles->pluck('name')->toArray(),
                'ministry_ids' => $u->ministries->pluck('id')->toArray(),
            ]);

        $invitations = Invitation::orderByDesc('created_at')->get()->map(fn (Invitation $i) => [
            'id' => $i->id,
            'email' => $i->email,
            'role' => $i->role,
            'token' => $i->token,
            'expires_at' => $i->expires_at?->toIso8601String(),
            'used_at' => $i->used_at?->toIso8601String(),
            'link' => route('register', ['invitation' => $i->token], true),
        ]);

        $members = Member::orderBy('name')->get(['id', 'name']);
        $roles = \Spatie\Permission\Models\Role::orderBy('name')->get(['id', 'name']);

        $churchId = Church::where('active', true)->orderBy('name')->value('id');
        $ministries = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'invitations' => $invitations,
            'members' => $members,
            'roles' => $roles,
            'ministries' => $ministries,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $valid = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'member_id' => ['nullable', 'exists:members,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
        ]);

        $user = User::create([
            'name' => $valid['name'],
            'email' => $valid['email'],
            'password' => Hash::make($valid['password']),
            'member_id' => $valid['member_id'] ?? null,
        ]);

        if (!empty($valid['role'])) {
            $user->assignRole($valid['role']);
        }

        if (($valid['role'] ?? '') === 'lider_ministerio' && !empty($valid['ministry_ids'])) {
            $user->ministries()->sync($valid['ministry_ids']);
        }

        return redirect()->route('users.index')->with('success', 'Usuário criado com sucesso.');
    }

    public function update(Request $request, User $user)
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'member_id' => ['nullable', 'exists:members,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
        ];
        if ($request->filled('password')) {
            $rules['password'] = ['required', 'confirmed', Password::defaults()];
        }
        $valid = $request->validate($rules);

        $user->name = $valid['name'];
        $user->email = $valid['email'];
        $user->member_id = $valid['member_id'] ?? null;
        if (!empty($valid['password'])) {
            $user->password = Hash::make($valid['password']);
        }
        $user->save();

        $user->syncRoles($valid['role'] ? [$valid['role']] : []);

        if (($valid['role'] ?? '') === 'lider_ministerio') {
            $user->ministries()->sync($valid['ministry_ids'] ?? []);
        } else {
            $user->ministries()->detach();
        }

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
}
