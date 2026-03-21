<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): RedirectResponse
    {
        return redirect()
            ->route('volunteers.index')
            ->with('success', 'A gestão de acesso ao app agora fica em Voluntários.');
    }

    public function store(Request $request)
    {
        $valid = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'confirmed', Password::defaults(), Rule::requiredIf(fn () => $request->filled('email'))],
            'member_id' => ['nullable', 'exists:members,id'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
            'ministry_ids' => ['nullable', 'array'],
            'ministry_ids.*' => ['exists:ministries,id'],
        ]);

        $passwordPlain = $valid['password'] ?? null;

        $user = User::create([
            'name' => $valid['name'],
            'email' => $valid['email'] ?? null,
            'password' => $passwordPlain ?? Str::random(64),
            'member_id' => $valid['member_id'] ?? null,
        ]);

        if (! empty($valid['role'])) {
            $user->assignRole($valid['role']);
        }

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
        $user->email = $valid['email'] ?? null;
        $user->member_id = $valid['member_id'] ?? null;
        if (! empty($valid['password'])) {
            $user->password = $valid['password'];
        }
        $user->save();

        $user->syncRoles($valid['role'] ? [$valid['role']] : []);

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
