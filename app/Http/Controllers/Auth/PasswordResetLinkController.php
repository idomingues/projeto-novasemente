<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\VolunteerContactDuplicateChecker;
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

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $user = $emailNorm
            ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
            : null;

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
