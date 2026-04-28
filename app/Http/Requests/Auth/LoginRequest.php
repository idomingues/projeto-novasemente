<?php

namespace App\Http\Requests\Auth;

use App\Models\AuthLoginEvent;
use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation (ensure church_id is integer when present).
     */
    protected function prepareForValidation(): void
    {
        $churchId = $this->input('church_id');
        if ($churchId !== null && $churchId !== '') {
            $this->merge(['church_id' => (int) $churchId]);
        }
        if ($churchId === '') {
            $this->merge(['church_id' => null]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'church_id' => ['nullable', 'integer', 'exists:churches,id'],
            'redirect' => ['nullable', 'string', 'max:500'],
            /** Campo armadilha: normalmente vazio; se preenchido, tratamos em `authenticate()`. */
            'website' => ['nullable', 'string', 'max:128'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        $login = trim((string) $this->input('login'));
        $ua = $this->userAgent();
        $ip = $this->ip();

        if (filled($this->input('website'))) {
            AuthLoginEvent::record(AuthLoginEvent::OUTCOME_HONEYPOT, null, $login, $ip, $ua);
            RateLimiter::hit($this->ipThrottleKey(), $this->ipDecaySeconds());

            throw ValidationException::withMessages([
                'login' => trans('auth.failed'),
            ]);
        }

        $this->ensureIpNotRateLimited();
        $this->ensureIsNotRateLimited();

        $password = (string) $this->input('password');

        $user = User::query()
            ->where(function ($q) use ($login) {
                $q->where('email', $login)
                    ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($login, 'UTF-8')]);
            })
            ->first();

        if (! $user) {
            RateLimiter::hit($this->throttleKey(), $this->identityDecaySeconds());
            RateLimiter::hit($this->ipThrottleKey(), $this->ipDecaySeconds());
            AuthLoginEvent::record(AuthLoginEvent::OUTCOME_FAILED, null, $login, $ip, $ua);

            throw ValidationException::withMessages([
                'login' => trans('auth.user'),
            ]);
        }

        if (! Hash::check($password, (string) $user->password)) {
            RateLimiter::hit($this->throttleKey(), $this->identityDecaySeconds());
            RateLimiter::hit($this->ipThrottleKey(), $this->ipDecaySeconds());
            AuthLoginEvent::record(AuthLoginEvent::OUTCOME_FAILED, null, $login, $ip, $ua);

            throw ValidationException::withMessages([
                'password' => trans('auth.password'),
            ]);
        }

        Auth::login($user, $this->boolean('remember'));

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        $max = max(1, (int) config('operations.login_max_attempts_per_identity', 5));
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), $max)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());
        AuthLoginEvent::record(
            AuthLoginEvent::OUTCOME_LOCKOUT,
            null,
            trim((string) $this->input('login')),
            $this->ip(),
            $this->userAgent(),
        );

        throw ValidationException::withMessages([
            'login' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    private function ensureIpNotRateLimited(): void
    {
        $max = max(1, (int) config('operations.login_max_attempts_per_ip', 40));
        if (! RateLimiter::tooManyAttempts($this->ipThrottleKey(), $max)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->ipThrottleKey());
        AuthLoginEvent::record(
            AuthLoginEvent::OUTCOME_IP_BLOCKED,
            null,
            trim((string) $this->input('login')),
            $this->ip(),
            $this->userAgent(),
        );

        throw ValidationException::withMessages([
            'login' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('login')).'|'.$this->ip());
    }

    private function ipThrottleKey(): string
    {
        return 'login-ip:'.sha1((string) $this->ip());
    }

    private function identityDecaySeconds(): int
    {
        return max(60, (int) config('operations.login_decay_seconds', 900));
    }

    private function ipDecaySeconds(): int
    {
        return max(60, (int) config('operations.login_ip_decay_seconds', 900));
    }
}
