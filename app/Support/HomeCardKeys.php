<?php

namespace App\Support;

/**
 * Chaves estáveis dos cards grandes da Home (marcadores por usuário).
 */
final class HomeCardKeys
{
    /** @var list<string> */
    public const ALLOWED = [
        'ns-whats',
        'ns-whats-departamento',
        'enquetes',
        'ano-biblico',
        'voluntario',
        'batismo',
        'biblioteca',
        'biblia',
        'caixa-promessas',
        'central-servicos',
        'classe-comecos',
        'comunidades',
        'culto',
        'horarios',
        'meditacao-diaria',
        'licao',
        'dizimos-pacto',
        'doacao',
        'doar-talentos',
        'em-que-cremos',
        'eventos',
        'fotos',
        'localizacao',
        'missao',
        'musica',
        'pastores',
        'oferta-nova-semente',
        'oracao',
        'quem-somos',
        'revista-adventista',
        'saude',
        'series',
        'suporte-app',
        'sobre-o-app',
    ];

    /**
     * Cards antigos que passaram a viver noutro atalho.
     *
     * @var array<string, string>
     */
    public const LEGACY_ALIASES = [
        'suporte-app' => 'sobre-o-app',
    ];

    public static function canonicalize(string $key): string
    {
        return self::LEGACY_ALIASES[$key] ?? $key;
    }

    public static function isAllowed(string $key): bool
    {
        $canonical = self::canonicalize($key);

        return in_array($canonical, self::ALLOWED, true) || in_array($key, self::ALLOWED, true);
    }

    /**
     * Chaves gravadas no banco que equivalem à chave canônica (inclui aliases).
     *
     * @return list<string>
     */
    public static function storageKeysFor(string $canonical): array
    {
        $keys = [$canonical];
        foreach (self::LEGACY_ALIASES as $legacy => $target) {
            if ($target === $canonical) {
                $keys[] = $legacy;
            }
        }

        return array_values(array_unique($keys));
    }

    /**
     * @param  list<string>  $keys
     * @return list<string>
     */
    public static function normalizeList(array $keys): array
    {
        $seen = [];
        $out = [];
        foreach ($keys as $key) {
            $canonical = self::canonicalize((string) $key);
            if (! in_array($canonical, self::ALLOWED, true)) {
                continue;
            }
            if (isset($seen[$canonical])) {
                continue;
            }
            $seen[$canonical] = true;
            $out[] = $canonical;
        }

        return $out;
    }
}
