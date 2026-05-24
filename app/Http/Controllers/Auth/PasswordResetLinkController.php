<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\VolunteerAppLogin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
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
            'showMailLogHint' => ! app()->isProduction() && config('mail.default') === 'log',
            'mailRecoveryUnavailable' => $this->mailRecoveryUnavailable(),
            'mailUnavailableTitle' => trans('passwords.mail_unavailable_title'),
            'mailUnavailableBody' => trans('passwords.mail_unavailable_body'),
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

        if ($this->mailRecoveryUnavailable()) {
            Log::critical('Recuperação de senha bloqueada: MAIL_MAILER=log em produção.', [
                'login' => $validated['email'],
                'user_email' => $user->email,
            ]);

            throw ValidationException::withMessages([
                'email' => [trans('passwords.mail_unavailable_field')],
            ]);
        }

        try {
            $status = Password::sendResetLink([
                'email' => $user->email,
            ]);
        } catch (TransportExceptionInterface $exception) {
            Log::error('Falha SMTP ao enviar recuperação de senha.', [
                'login' => $validated['email'],
                'user_email' => $user->email,
                'message' => $exception->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'email' => [trans('passwords.mail_send_failed')],
            ]);
        }

        if ($status == Password::RESET_LINK_SENT) {
            // Inertia: 303 após POST alinha com o tratamento de validação (evita resposta “muda” sem flash).
            return back()->with('status', __($status))->setStatusCode(303);
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }

    private function mailRecoveryUnavailable(): bool
    {
        return app()->isProduction() && config('mail.default') === 'log';
    }
}
