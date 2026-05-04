<?php

namespace App\Http\Middleware;

use App\Services\PageViewRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordPageViewsAfterResponse
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        PageViewRecorder::recordAfterResponse($request, $response);
    }
}
