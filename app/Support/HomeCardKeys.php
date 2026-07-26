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

    public static function isAllowed(string $key): bool
    {
        return in_array($key, self::ALLOWED, true);
    }
}
