<?php

namespace App\Support;

/**
 * Públicos do devocional diário (CPB Mais).
 */
final class DevotionalAudience
{
    public const ADULTOS = 'adultos';

    public const MULHERES = 'mulheres';

    public const JOVENS = 'jovens';

    /** @var list<string> */
    public const ALL = [self::ADULTOS, self::MULHERES, self::JOVENS];

    public const DEFAULT = self::ADULTOS;

    /** Landing pages CPB com botão «Ler Devocional». */
    public const URL_ADULTOS = 'https://mais.cpb.com.br/meditacoes-diarias/';

    public const URL_MULHERES = 'https://mais.cpb.com.br/meditacao-da-mulher-2/';

    public const URL_JOVENS = 'https://mais.cpb.com.br/meditacao-jovem/';

    public static function normalize(?string $value): string
    {
        $v = strtolower(trim((string) $value));

        return in_array($v, self::ALL, true) ? $v : self::DEFAULT;
    }

    /**
     * Query `audience` tem prioridade; senão usa o cookie da última escolha do usuário.
     */
    public static function fromRequest(\Illuminate\Http\Request $request): string
    {
        if ($request->query->has('audience')) {
            return self::normalize($request->query('audience'));
        }

        return self::normalize($request->cookie('ns_devotional_audience'));
    }

    public static function label(string $audience): string
    {
        return match (self::normalize($audience)) {
            self::MULHERES => 'Mulher',
            self::JOVENS => 'Jovem',
            default => 'Adulto',
        };
    }

    public static function title(string $audience): string
    {
        return match (self::normalize($audience)) {
            self::MULHERES => 'Devocional da Mulher',
            self::JOVENS => 'Devocional Jovem',
            default => 'Meditação diária',
        };
    }

    /**
     * URL de índice CPB para o público (sem override da igreja).
     */
    public static function defaultUrl(string $audience): string
    {
        return match (self::normalize($audience)) {
            self::MULHERES => self::URL_MULHERES,
            self::JOVENS => self::URL_JOVENS,
            default => self::URL_ADULTOS,
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return [
            ['value' => self::ADULTOS, 'label' => self::label(self::ADULTOS)],
            ['value' => self::MULHERES, 'label' => self::label(self::MULHERES)],
            ['value' => self::JOVENS, 'label' => self::label(self::JOVENS)],
        ];
    }
}
