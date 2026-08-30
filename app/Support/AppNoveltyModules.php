<?php

namespace App\Support;

use App\Models\Church;
use Illuminate\Support\Facades\Route;

/**
 * Catálogo de módulos de destino para novidades do APP.
 *
 * @phpstan-type NoveltyModule array{key: string, label: string, route: string}
 */
final class AppNoveltyModules
{
    /**
     * Destinos sempre disponíveis (não dependem de feature da igreja).
     *
     * @var list<array{key: string, label: string, route: string}>
     */
    private const ALWAYS_ON = [
        ['key' => 'home', 'label' => 'Início', 'route' => 'mobile.home'],
        ['key' => 'publications', 'label' => 'Publicações', 'route' => 'mobile.publications-feed'],
    ];

    /**
     * @return list<NoveltyModule>
     */
    public static function all(): array
    {
        $items = [];

        foreach (self::ALWAYS_ON as $item) {
            if (Route::has($item['route'])) {
                $items[] = $item;
            }
        }

        foreach (ChurchAppFeatures::definitions() as $key => $definition) {
            $route = self::resolveRouteName($definition['routes'] ?? []);
            if ($route === null) {
                continue;
            }

            $items[] = [
                'key' => $key,
                'label' => (string) ($definition['label'] ?? $key),
                'route' => $route,
            ];
        }

        usort($items, static fn (array $a, array $b) => strcasecmp($a['label'], $b['label']));

        return $items;
    }

    /**
     * Módulos cujo destino existe e (se for feature) está ligado na igreja.
     *
     * @return list<NoveltyModule>
     */
    public static function forChurch(?Church $church): array
    {
        $alwaysOnKeys = array_column(self::ALWAYS_ON, 'key');

        return array_values(array_filter(
            self::all(),
            static function (array $item) use ($church, $alwaysOnKeys): bool {
                if (in_array($item['key'], $alwaysOnKeys, true)) {
                    return true;
                }

                return ChurchAppFeatures::isEnabled($church, $item['key']);
            },
        ));
    }

    /**
     * @return NoveltyModule|null
     */
    public static function find(string $key, ?Church $church = null): ?array
    {
        foreach (self::forChurch($church) as $item) {
            if ($item['key'] === $key) {
                return $item;
            }
        }

        return null;
    }

    /**
     * @return NoveltyModule|null
     */
    public static function findAny(string $key): ?array
    {
        foreach (self::all() as $item) {
            if ($item['key'] === $key) {
                return $item;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public static function keysForChurch(?Church $church): array
    {
        return array_column(self::forChurch($church), 'key');
    }

    public static function href(string $routeName): ?string
    {
        if (! Route::has($routeName)) {
            return null;
        }

        try {
            return route($routeName, [], absolute: false);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  list<string>  $patterns
     */
    private static function resolveRouteName(array $patterns): ?string
    {
        foreach ($patterns as $pattern) {
            $candidates = [];

            if (str_ends_with($pattern, '.*')) {
                $prefix = substr($pattern, 0, -2);
                $candidates[] = $prefix;
                $candidates[] = $prefix.'.index';
            } else {
                $candidates[] = $pattern;
                $candidates[] = $pattern.'.index';
            }

            foreach ($candidates as $name) {
                if ($name !== '' && Route::has($name)) {
                    return $name;
                }
            }
        }

        return null;
    }
}
