<?php

namespace App\Support;

use App\Models\Church;
use Carbon\Carbon;
use Illuminate\Support\Facades\Route;

/**
 * Campanhas de módulos em destaque na Home (período + feature da igreja).
 */
final class HomeModuleSpotlight
{
    /**
     * @return array{
     *     interval_seconds: int,
     *     items: list<array{
     *         id: string,
     *         feature_key: string|null,
     *         route: string,
     *         href: string,
     *         badge: string,
     *         title: string,
     *         subtitle: string,
     *         cta: string,
     *         icon_key: string,
     *         home_card_id: string|null
     *     }>,
     *     home_card_ids: list<string>
     * }|null
     */
    public static function forChurch(?Church $church, ?Carbon $now = null): ?array
    {
        $now = ($now ?? now())->copy()->timezone((string) config('app.timezone'));

        /** @var list<array<string, mixed>> $campaigns */
        $campaigns = config('home_module_spotlight.campaigns', []);

        $items = [];
        foreach ($campaigns as $campaign) {
            $resolved = self::resolveCampaign($campaign, $church, $now);
            if ($resolved !== null) {
                $items[] = $resolved;
            }
        }

        if ($items === []) {
            return null;
        }

        $interval = (int) config('home_module_spotlight.interval_seconds', 6);
        if ($interval < 3) {
            $interval = 3;
        }

        $first = $items[0];
        $homeCardIds = [];
        foreach ($items as $item) {
            $cardId = trim((string) ($item['home_card_id'] ?? ''));
            if ($cardId !== '' && ! in_array($cardId, $homeCardIds, true)) {
                $homeCardIds[] = $cardId;
            }
        }

        // Raiz espelha o 1º item para assets JS antigos em cache após deploy parcial.
        return array_merge($first, [
            'interval_seconds' => $interval,
            'items' => $items,
            'home_card_ids' => $homeCardIds,
        ]);
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
     *     cta: string,
     *     icon_key: string,
     *     home_card_id: string|null
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

        $iconKey = trim((string) ($campaign['icon_key'] ?? ''));
        if ($iconKey === '') {
            $iconKey = $featureKey ?: 'sparkles';
        }

        $homeCardId = trim((string) ($campaign['home_card_id'] ?? ''));

        return [
            'id' => $id,
            'feature_key' => $featureKey,
            'route' => $routeName,
            'href' => $href,
            'badge' => trim((string) ($campaign['badge'] ?? 'New')) ?: 'New',
            'title' => trim((string) ($campaign['title'] ?? '')) ?: 'Novidade',
            'subtitle' => trim((string) ($campaign['subtitle'] ?? '')),
            'cta' => trim((string) ($campaign['cta'] ?? 'Abrir')) ?: 'Abrir',
            'icon_key' => $iconKey,
            'home_card_id' => $homeCardId !== '' ? $homeCardId : null,
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
