<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
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
     * Display the login view.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
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

        $afterLogin = $this->safeRedirectPath($request->string('redirect')->toString());
        if ($afterLogin !== null) {
            return redirect()->to($afterLogin);
        }

        return redirect()->intended(route('mobile.culto'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect()->route('mobile.culto');
    }
}
