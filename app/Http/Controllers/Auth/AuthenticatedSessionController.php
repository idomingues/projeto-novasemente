<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Church;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        $loginEmail = session('login_pending_email');
        $loginIsSuperAdmin = session('login_is_super_admin', false);
        $loginChurches = session('login_churches', []);

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'loginStep' => $loginEmail ? 2 : 1,
            'loginEmail' => $loginEmail,
            'loginIsSuperAdmin' => $loginIsSuperAdmin,
            'loginChurches' => $loginChurches,
        ]);
    }

    /**
     * Verifica o e-mail e retorna se é super admin e lista de igrejas (para seleção no login).
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'string', 'email']]);
        $email = $request->input('email');

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json(['exists' => false]);
        }

        $isSuperAdmin = $user->hasRole('super_admin');
        $churches = [];
        if ($isSuperAdmin) {
            $churches = Church::where('active', true)->orderBy('name')->get(['id', 'name', 'slug', 'logo_url'])->toArray();
        }

        session([
            'login_pending_email' => $email,
            'login_is_super_admin' => $isSuperAdmin,
            'login_churches' => $churches,
        ]);

        return response()->json([
            'exists' => true,
            'is_super_admin' => $isSuperAdmin,
            'churches' => $churches,
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

        if ($user && $user->hasRole('super_admin') && $request->filled('church_id')) {
            $churchId = (int) $request->input('church_id');
            if (Church::where('id', $churchId)->where('active', true)->exists()) {
                $request->session()->put('working_church_id', $churchId);
            }
        }

        $request->session()->forget(['login_pending_email', 'login_is_super_admin', 'login_churches']);

        if ($user && $user->hasRole('lider_ministerio')) {
            return redirect()->route('escalas.index', [], false);
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
