<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

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
            $invitation = Invitation::where('token', $token)->first();
            if ($invitation && !$invitation->isValid()) {
                $invitation = null;
            }
        }

        return Inertia::render('Auth/Register', [
            'invitation' => $invitation ? [
                'email' => $invitation->email,
                'role' => $invitation->role,
                'token' => $invitation->token,
            ] : null,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'invitation_token' => ['nullable', 'string'],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        if ($request->filled('invitation_token')) {
            $invitation = Invitation::where('token', $request->invitation_token)->first();
            if ($invitation && $invitation->isValid() && $invitation->email === $request->email) {
                $invitation->update(['used_at' => now()]);
                if ($invitation->role) {
                    $user->assignRole($invitation->role);
                }
            }
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
