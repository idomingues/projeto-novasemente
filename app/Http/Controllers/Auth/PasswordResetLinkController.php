<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\VolunteerAppLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'showMailLogHint' => config('mail.default') === 'log',
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        // Mesma resolução do login: e-mail em users ou espelhado do cadastro de voluntário.
        $user = VolunteerAppLogin::findUserByLogin($validated['email']);

        if ($user === null || trim((string) $user->email) === '') {
            throw ValidationException::withMessages([
                'email' => [trans('passwords.user')],
            ]);
        }

        $status = Password::sendResetLink([
            'email' => $user->email,
        ]);

        if ($status == Password::RESET_LINK_SENT) {
            // Inertia: 303 após POST alinha com o tratamento de validação (evita resposta “muda” sem flash).
            return back()->with('status', __($status))->setStatusCode(303);
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
