<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\VolunteerContactDuplicateChecker;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class NewPasswordController extends Controller
{
    /**
     * Display the password reset view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]);
    }

    /**
     * Handle an incoming new password request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail($validated['email']);
        $matchedUser = $emailNorm
            ? User::query()->whereRaw('LOWER(TRIM(COALESCE(email, ""))) = ?', [$emailNorm])->first()
            : null;

        $credentials = $request->only('password', 'password_confirmation', 'token');
        $credentials['email'] = $matchedUser?->email ?? $validated['email'];

        $status = Password::reset(
            $credentials,
            function ($user) use ($validated) {
                $user->forceFill([
                    'password' => $validated['password'],
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        // If the password was successfully reset, we will redirect the user back to
        // the application's home authenticated view. If there is an error we can
        // redirect them back to where they came from with their error message.
        if ($status == Password::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', __($status))->setStatusCode(303);
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
