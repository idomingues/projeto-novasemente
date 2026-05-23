<?php

namespace App\Services;

use App\Models\PageViewDailyStat;
use App\Support\PageViewRouteLabels;
use App\Support\PageViewShellRoutes;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class PageViewAnalytics
{
    /**
     * @return array{
     *   enabled: bool,
     *   note: string|null,
     *   selectedMonth: string,
     *   selectedMonthLabel: string,
     *   availableMonths: list<array{key: string, label: string}>,
     *   totalViews: int,
     *   pages: list<array{routeName: string, label: string, views: int}>
     * }
     */
    public static function monthlyForChurch(?int $churchId, ?string $monthParam = null): array
    {
        $empty = [
            'enabled' => config('page-views.enabled', true),
            'note' => null,
            'selectedMonth' => self::normalizeMonthKey($monthParam),
            'selectedMonthLabel' => self::monthLabel(self::normalizeMonthKey($monthParam)),
            'availableMonths' => [],
            'totalViews' => 0,
            'pages' => [],
        ];

        if (! config('page-views.enabled', true)) {
            $empty['note'] = 'Contagem de páginas desativada (PAGE_VIEWS_ENABLED=false).';

            return $empty;
        }

        if (! Schema::hasTable('page_view_daily_stats')) {
            $empty['note'] = 'Tabela page_view_daily_stats ainda não existe. Execute as migrations.';

            return $empty;
        }

        if ($churchId === null) {
            $empty['note'] = 'Selecione uma igreja ativa no topo do painel para ver as estatísticas por igreja.';

            return $empty;
        }

        $churchId = (int) $churchId;
        $selectedMonth = self::normalizeMonthKey($monthParam);
        $maxMonths = max(3, (int) config('operations.page_views_months', 12));

        $availableMonths = self::availableMonths($churchId, $maxMonths);
        if ($availableMonths !== [] && ! collect($availableMonths)->contains(fn ($m) => $m['key'] === $selectedMonth)) {
            $selectedMonth = $availableMonths[0]['key'];
        }

        $start = Carbon::createFromFormat('Y-m', $selectedMonth)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $rows = PageViewDailyStat::query()
            ->where('church_id', $churchId)
            ->whereBetween('visited_on', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('route_name, SUM(views) as total_views')
            ->groupBy('route_name')
            ->orderByDesc('total_views')
            ->get();

        $pages = [];
        $totalViews = 0;
        foreach ($rows as $row) {
            $routeName = (string) $row->route_name;
            if (PageViewShellRoutes::isExcluded($routeName)) {
                continue;
            }
            $views = (int) $row->total_views;
            $totalViews += $views;
            $pages[] = [
                'routeName' => $routeName,
                'label' => PageViewRouteLabels::label($routeName),
                'views' => $views,
            ];
        }

        usort($pages, fn (array $a, array $b) => $b['views'] <=> $a['views']);

        return [
            'enabled' => true,
            'note' => null,
            'selectedMonth' => $selectedMonth,
            'selectedMonthLabel' => self::monthLabel($selectedMonth),
            'availableMonths' => $availableMonths,
            'totalViews' => $totalViews,
            'pages' => $pages,
        ];
    }

    /**
     * Ranking para o widget do dashboard (exclui hubs de navegação e rotas técnicas).
     *
     * @return list<array{routeName: string, label: string, views: int}>
     */
    public static function topPagesForChurch(int $churchId, int $days, int $limit): array
    {
        if ($limit < 1 || $days < 1) {
            return [];
        }

        $since = now()->subDays($days - 1)->startOfDay();

        $rows = PageViewDailyStat::query()
            ->where('church_id', $churchId)
            ->where('visited_on', '>=', $since->toDateString())
            ->selectRaw('route_name, SUM(views) as total_views')
            ->groupBy('route_name')
            ->orderByDesc('total_views')
            ->get();

        $pages = [];
        foreach ($rows as $row) {
            $routeName = (string) $row->route_name;
            if (PageViewShellRoutes::isExcluded($routeName)) {
                continue;
            }
            $pages[] = [
                'routeName' => $routeName,
                'label' => PageViewRouteLabels::label($routeName),
                'views' => (int) $row->total_views,
            ];
            if (count($pages) >= $limit) {
                break;
            }
        }

        return $pages;
    }

    public static function normalizeMonthKey(?string $raw): string
    {
        if (is_string($raw) && preg_match('/^\d{4}-\d{2}$/', $raw) === 1) {
            try {
                Carbon::createFromFormat('Y-m', $raw)->startOfMonth();

                return $raw;
            } catch (\Throwable) {
                // fallthrough
            }
        }

        return now()->format('Y-m');
    }

    public static function monthLabel(string $monthKey): string
    {
        try {
            $date = Carbon::createFromFormat('Y-m', $monthKey)->locale('pt_BR');

            return mb_convert_case($date->translatedFormat('F Y'), MB_CASE_TITLE, 'UTF-8');
        } catch (\Throwable) {
            return $monthKey;
        }
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    private static function availableMonths(int $churchId, int $limit): array
    {
        $driver = DB::connection()->getDriverName();
        $expr = $driver === 'sqlite'
            ? "strftime('%Y-%m', visited_on)"
            : "DATE_FORMAT(visited_on, '%Y-%m')";

        /** @var Collection<int, object{ym: string}> $keys */
        $keys = PageViewDailyStat::query()
            ->where('church_id', $churchId)
            ->selectRaw("{$expr} as ym")
            ->groupByRaw($expr)
            ->orderByDesc('ym')
            ->limit($limit)
            ->get();

        $months = [];
        foreach ($keys as $row) {
            $key = (string) $row->ym;
            if ($key === '') {
                continue;
            }
            $months[] = [
                'key' => $key,
                'label' => self::monthLabel($key),
            ];
        }

        if ($months === []) {
            $current = now()->format('Y-m');
            $months[] = [
                'key' => $current,
                'label' => self::monthLabel($current),
            ];
        }

        return $months;
    }
}
