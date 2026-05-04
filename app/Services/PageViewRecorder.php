<?php

namespace App\Services;

use App\Models\Church;
use App\Models\PageViewDailyStat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

final class PageViewRecorder
{
    public static function recordAfterResponse(Request $request, SymfonyResponse $response): void
    {
        if (! config('page-views.enabled', true)) {
            return;
        }

        if (! Schema::hasTable('page_view_daily_stats')) {
            return;
        }

        if ($request->method() !== 'GET') {
            return;
        }

        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            return;
        }

        $route = $request->route();
        if ($route === null) {
            return;
        }

        $routeName = $route->getName();
        if (! is_string($routeName) || $routeName === '') {
            return;
        }

        if (self::shouldIgnoreRoute($routeName)) {
            return;
        }

        try {
            $churchId = (int) (Church::resolveWorkingId($request) ?? 0);
            $visitedOn = now()->toDateString();
            $now = now();

            $routeName = mb_substr($routeName, 0, 190);

            PageViewDailyStat::query()->upsert(
                [
                    [
                        'church_id' => $churchId,
                        'route_name' => $routeName,
                        'visited_on' => $visitedOn,
                        'views' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                ],
                ['church_id', 'route_name', 'visited_on'],
                [
                    'views' => DB::raw('views + 1'),
                    'updated_at' => $now,
                ],
            );

            $user = $request->user();
            if (
                $user
                && config('page-views.track_user_daily_reach', true)
                && Schema::hasTable('user_feature_daily_reach')
            ) {
                DB::table('user_feature_daily_reach')->insertOrIgnore([
                    'user_id' => $user->id,
                    'church_id' => $churchId,
                    'route_name' => $routeName,
                    'visited_on' => $visitedOn,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        } catch (\Throwable) {
            // Nunca falhar o pedido por causa de estatísticas.
        }
    }

    private static function shouldIgnoreRoute(string $routeName): bool
    {
        /** @var array<int, string> $exact */
        $exact = config('page-views.ignored_routes', []);
        if (in_array($routeName, $exact, true)) {
            return true;
        }

        /** @var array<int, string> $prefixes */
        $prefixes = config('page-views.ignored_route_prefixes', []);
        foreach ($prefixes as $prefix) {
            if ($prefix === '') {
                continue;
            }
            if ($routeName === $prefix || str_starts_with($routeName, $prefix.'.')) {
                return true;
            }
        }

        if (str_starts_with($routeName, 'password.')) {
            return true;
        }

        if (str_starts_with($routeName, 'verification.')) {
            return true;
        }

        return in_array($routeName, ['login', 'logout', 'register'], true);
    }
}
