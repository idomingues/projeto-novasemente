<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Evita que o browser (sobretudo mobile) guarde em cache o HTML do Inertia com
 * tags @vite antigas — caso contrário o utilizador continua a carregar JS/CSS de builds anteriores.
 */
class PreventBrowserCacheHtmlResponses
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $contentType = $response->headers->get('Content-Type', '');
        if (! str_starts_with($contentType, 'text/html')) {
            return $response;
        }

        $response->headers->set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');

        return $response;
    }
}
