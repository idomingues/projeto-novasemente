<?php

namespace App\Support;

use App\Models\Church;
use Illuminate\Http\Request;

/**
 * Ativação de funcionalidades do app por igreja (membros).
 */
final class ChurchAppFeatures
{
    /**
     * @return array<string, array{label: string, group: string, routes: list<string>}>
     */
    public static function definitions(): array
    {
        return config('app_features.features', []);
    }

    /**
     * @return array<string, string>
     */
    public static function groupLabels(): array
    {
        return config('app_features.group_labels', []);
    }

    /**
     * @return list<string>
     */
    public static function alwaysEnabledRoutes(): array
    {
        return config('app_features.always_enabled_routes', []);
    }

    /**
     * @return list<string>
     */
    public static function allKeys(): array
    {
        return array_keys(self::definitions());
    }

    /**
     * @return list<string>
     */
    public static function disabledKeysForChurch(?Church $church): array
    {
        if ($church === null) {
            return [];
        }

        $disabled = $church->disabled_app_features ?? [];

        if (! is_array($disabled)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            $disabled,
            fn ($key) => is_string($key) && array_key_exists($key, self::definitions()),
        )));
    }

    /**
     * @return list<string>
     */
    public static function disabledKeysForRequest(Request $request): array
    {
        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return [];
        }

        $church = Church::query()->find($churchId);

        return self::disabledKeysForChurch($church);
    }

    public static function isEnabled(?Church $church, string $key): bool
    {
        if ($church === null) {
            return true;
        }

        return ! in_array($key, self::disabledKeysForChurch($church), true);
    }

    public static function featureKeyForRoute(string $routeName): ?string
    {
        if (in_array($routeName, self::alwaysEnabledRoutes(), true)) {
            return null;
        }

        foreach (self::definitions() as $key => $definition) {
            foreach ($definition['routes'] ?? [] as $pattern) {
                if (self::routeMatches($routeName, $pattern)) {
                    return $key;
                }
            }
        }

        return null;
    }

    public static function assertRouteEnabled(Request $request): void
    {
        $user = $request->user();
        if ($user !== null && $user->canAccessAdminMenu()) {
            return;
        }

        $routeName = $request->route()?->getName();
        if ($routeName === null || $routeName === '') {
            return;
        }

        if (in_array($routeName, self::alwaysEnabledRoutes(), true)) {
            return;
        }

        $featureKey = self::featureKeyForRoute($routeName);
        if ($featureKey === null) {
            return;
        }

        $churchId = Church::resolveWorkingId($request);
        $church = $churchId !== null ? Church::query()->find($churchId) : null;

        if ($church !== null && ! self::isEnabled($church, $featureKey)) {
            abort(404, 'Esta funcionalidade não está disponível no momento.');
        }
    }

    /**
     * @return list<array{key: string, label: string, group: string, groupLabel: string, enabled: bool}>
     */
    public static function featuresForAdmin(?Church $church): array
    {
        $disabled = self::disabledKeysForChurch($church);
        $groupLabels = self::groupLabels();
        $items = [];

        foreach (self::definitions() as $key => $definition) {
            $group = (string) ($definition['group'] ?? 'other');
            $items[] = [
                'key' => $key,
                'label' => (string) ($definition['label'] ?? $key),
                'group' => $group,
                'groupLabel' => $groupLabels[$group] ?? $group,
                'enabled' => ! in_array($key, $disabled, true),
            ];
        }

        return $items;
    }

    /**
     * @return list<array{key: string, label: string, features: list<array{key: string, label: string, enabled: bool}>}>
     */
    public static function groupedFeaturesForAdmin(?Church $church): array
    {
        $grouped = [];
        $order = array_keys(self::groupLabels());

        foreach (self::featuresForAdmin($church) as $feature) {
            $group = $feature['group'];
            if (! isset($grouped[$group])) {
                $grouped[$group] = [
                    'key' => $group,
                    'label' => $feature['groupLabel'],
                    'features' => [],
                ];
            }
            $grouped[$group]['features'][] = [
                'key' => $feature['key'],
                'label' => $feature['label'],
                'enabled' => $feature['enabled'],
            ];
        }

        $result = [];
        foreach ($order as $groupKey) {
            if (isset($grouped[$groupKey])) {
                $result[] = $grouped[$groupKey];
            }
        }

        foreach ($grouped as $groupKey => $group) {
            if (! in_array($groupKey, $order, true)) {
                $result[] = $group;
            }
        }

        return $result;
    }

    /**
     * @param  list<string>  $enabledKeys
     */
    public static function syncEnabledKeys(Church $church, array $enabledKeys): void
    {
        $allKeys = self::allKeys();
        $enabledKeys = array_values(array_intersect($enabledKeys, $allKeys));
        $disabled = array_values(array_diff($allKeys, $enabledKeys));

        $church->update(['disabled_app_features' => $disabled]);
    }

    private static function routeMatches(string $routeName, string $pattern): bool
    {
        if (str_ends_with($pattern, '.*')) {
            $prefix = substr($pattern, 0, -2);

            return $routeName === $prefix || str_starts_with($routeName, $prefix.'.');
        }

        return $routeName === $pattern;
    }
}
