<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rotas do painel administrativo (ex.: `/dashboard`) — só equipa com menu lateral.
 */
class EnsureCanAccessAdminMenu
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user !== null && ! $user->canAccessAdminMenu()) {
            return redirect()
                ->route('mobile.home')
                ->with('error', 'Esta área é reservada à equipa da igreja.');
        }

        return $next($request);
    }
}
