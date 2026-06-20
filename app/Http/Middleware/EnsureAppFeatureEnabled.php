<?php

namespace App\Http\Middleware;

use App\Support\ChurchAppFeatures;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAppFeatureEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        ChurchAppFeatures::assertRouteEnabled($request);

        return $next($request);
    }
}
