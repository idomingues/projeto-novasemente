<?php

namespace App\Support;

use App\Models\Church;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;

/**
 * Campanha de módulo em destaque na Home (período + feature da igreja).
 */
final class HomeModuleSpotlight
{
    /**
     * @return array{
     *     id: string,
     *     feature_key: string|null,
     *     route: string,
     *     href: string,
     *     badge: string,
     *     title: string,
     *     subtitle: string,
     *     cta: string
     * }|null
     */
    public static function forChurch(?Church $church, ?Carbon $now = null): ?array
    {
        $now = ($now ?? now())->copy()->timezone((string) config('app.timezone'));

        /** @var list<array<string, mixed>> $campaigns */
        $campaigns = config('home_module_spotlight.campaigns', []);

        foreach ($campaigns as $campaign) {
            $resolved = self::resolveCampaign($campaign, $church, $now);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $campaign
     * @return array{
     *     id: string,
     *     feature_key: string|null,
     *     route: string,
     *     href: string,
     *     badge: string,
     *     title: string,
     *     subtitle: string,
     *     cta: string
     * }|null
     */
    private static function resolveCampaign(array $campaign, ?Church $church, Carbon $now): ?array
    {
        $id = trim((string) ($campaign['id'] ?? ''));
        $routeName = trim((string) ($campaign['route'] ?? ''));
        if ($id === '' || $routeName === '' || ! Route::has($routeName)) {
            return null;
        }

        $startsAt = self::parseDayStart($campaign['starts_at'] ?? null);
        $endsAt = self::parseDayEnd($campaign['ends_at'] ?? null);
        if ($startsAt !== null && $now->lt($startsAt)) {
            return null;
        }
        if ($endsAt !== null && $now->gt($endsAt)) {
            return null;
        }

        $featureKey = isset($campaign['feature_key']) && $campaign['feature_key'] !== null && $campaign['feature_key'] !== ''
            ? (string) $campaign['feature_key']
            : null;

        if ($church !== null && $featureKey !== null && ! ChurchAppFeatures::isEnabled($church, $featureKey)) {
            return null;
        }

        try {
            $href = route($routeName, [], absolute: false);
        } catch (\Throwable) {
            return null;
        }

        return [
            'id' => $id,
            'feature_key' => $featureKey,
            'route' => $routeName,
            'href' => $href,
            'badge' => trim((string) ($campaign['badge'] ?? 'Em destaque')) ?: 'Em destaque',
            'title' => trim((string) ($campaign['title'] ?? '')) ?: 'Novidade',
            'subtitle' => trim((string) ($campaign['subtitle'] ?? '')),
            'cta' => trim((string) ($campaign['cta'] ?? 'Abrir')) ?: 'Abrir',
        ];
    }

    private static function parseDayStart(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value, (string) config('app.timezone'))->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    private static function parseDayEnd(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $value, (string) config('app.timezone'))->endOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
