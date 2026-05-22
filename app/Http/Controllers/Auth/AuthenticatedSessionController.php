<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\AuthLoginEvent;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Allow only same-origin relative paths (open redirect safe).
     */
    private function safeRedirectPath(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }
        $path = trim($path);
        if (! str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return null;
        }
        if (preg_match('/[\r\n\\\\]/', $path)) {
            return null;
        }

        return $path;
    }

    /**
     * Evita `redirect()->intended('/dashboard')` para membros (URL fica na sessão após 401/redirect ao login).
     */
    private function forgetDashboardIntendedIfUserLacksStaffAccess(Request $request): void
    {
        $intended = $request->session()->get('url.intended');
        if (! is_string($intended) || $intended === '') {
            return;
        }
        $path = parse_url($intended, PHP_URL_PATH);
        if (! is_string($path) || ! preg_match('#/dashboard/?$#', $path)) {
            return;
        }
        $user = $request->user();
        if ($user instanceof User && ! $user->canAccessAdminMenu()) {
            $request->session()->forget('url.intended');
        }
    }

    /**
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'volunteerSignupWelcome' => (bool) session('volunteer_signup_welcome', false),
            'redirectTo' => $this->safeRedirectPath($request->query('redirect')),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        if ($user) {
            AuthLoginEvent::record(
                AuthLoginEvent::OUTCOME_SUCCESS,
                (int) $user->id,
                trim((string) $request->input('login')),
                $request->ip(),
                $request->userAgent(),
            );
        }

        $afterLogin = $this->safeRedirectPath($request->string('redirect')->toString());
        if ($afterLogin !== null) {
            return redirect()->to($afterLogin);
        }

        $this->forgetDashboardIntendedIfUserLacksStaffAccess($request);

        return redirect()->intended(route('mobile.home'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('mobile.home');
    }
}
