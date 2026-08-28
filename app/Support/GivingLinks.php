<?php

namespace App\Support;

use App\Models\Church;

/**
 * Links oficiais de contribuição (7me) usados no app e na landing pública /oferta.
 */
final class GivingLinks
{
    public const TITHE_FALLBACK_URL = 'https://7me.app/71/eax0dw';

    public const OFFERING_URL = 'https://7me.app/71/g7y95y';

    public const OFFERING_CAIXA_FIXO_URL = 'https://7me.app/71/r8ctoh';

    public static function titheUrl(?Church $church): string
    {
        $custom = trim((string) ($church?->donation_url ?? ''));

        return $custom !== '' ? $custom : self::TITHE_FALLBACK_URL;
    }

    public static function offeringUrl(bool $caixaFixo = false): string
    {
        return $caixaFixo ? self::OFFERING_CAIXA_FIXO_URL : self::OFFERING_URL;
    }
}
