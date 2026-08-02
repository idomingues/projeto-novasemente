<?php

namespace App\Support;

use App\Models\News;
use Carbon\CarbonInterface;

/**
 * Publicações automáticas / exemplo do feed «Meditação diária».
 */
final class MeditationDailyFeed
{
    public const TYPE = 'meditation';

    public const SLUG_PREFIX = 'meditacao-diaria-';

    public const EXAMPLE_SLUG = 'meditacao-diaria-exemplo';

    /**
     * Capas portrait (nascer / pôr do sol) via Unsplash — hotlink gratuito.
     * Fonte de busca: https://unsplash.com/s/photos/sunrise?orientation=portrait
     *
     * @return list<string>
     */
    public static function sunriseCoverPool(): array
    {
        return [
            'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1080&q=80',
            'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1080&q=80',
        ];
    }

    public static function isMeditationNews(News $post): bool
    {
        $slug = trim((string) $post->slug);

        return str_starts_with($slug, self::SLUG_PREFIX);
    }

    public static function slugForDate(CarbonInterface $date): string
    {
        return self::SLUG_PREFIX.$date->format('Y-m-d');
    }

    /**
     * Fallback estático (sem rede). Preferir MeditationDailyCoverFetcher no job diário.
     */
    public static function coverForDate(CarbonInterface $date): string
    {
        $pool = self::sunriseCoverPool();
        $n = count($pool);
        $index = (((int) $date->format('Y') * 366) + (int) $date->format('z')) % $n;

        return $pool[$index];
    }

    /**
     * Conteúdo de exemplo (antes do job das 6h).
     *
     * @return array{title: string, verse: string, citation: string, body: string}
     */
    public static function examplePayload(): array
    {
        return [
            'title' => 'Meditação diária',
            'verse' => 'Ele o cobrirá com as Suas penas, e, sob as Suas asas, você estará seguro.',
            'citation' => 'Salmo 91:4',
            'body' => <<<'TXT'
As filhas e os filhos de Deus, ao longo da história, sempre estiveram protegidos. Aprender a orar, confiar, suportar provações, obedecer e servir é viver sob as asas do Pai.

Hoje, pare por um instante. Leia a meditação completa e deixe a graça de Deus renovar o seu coração.
TXT,
        ];
    }

    /**
     * Extrai versículo + citação gravados no body da notícia (formato estável para o feed).
     *
     * @return array{verse: string, citation: string, body: string}
     */
    public static function parseStoredBody(?string $body, ?string $excerpt = null): array
    {
        $raw = trim((string) $body);
        $excerpt = trim((string) $excerpt);

        if (preg_match('/^\[verse\]\s*(.+?)\s*\[\/verse\]\s*\[citation\]\s*(.+?)\s*\[\/citation\]\s*(.*)$/is', $raw, $m)) {
            return [
                'verse' => trim($m[1]),
                'citation' => trim($m[2]),
                'body' => trim($m[3]),
            ];
        }

        return [
            'verse' => $excerpt !== '' ? $excerpt : 'Meditação de hoje',
            'citation' => '',
            'body' => $raw !== '' ? $raw : $excerpt,
        ];
    }

    public static function encodeBody(string $verse, string $citation, string $body): string
    {
        return "[verse]\n".trim($verse)."\n[/verse]\n[citation]\n".trim($citation)."\n[/citation]\n\n".trim($body);
    }

    /**
     * Extrai título, versículo e trecho a partir do HTML já processado da meditação CPB.
     *
     * @return array{title: string, verse: string, citation: string, body: string}
     */
    public static function extractFromMeditationHtml(string $html): array
    {
        $fallback = self::examplePayload();
        $html = trim($html);
        if ($html === '') {
            return $fallback;
        }

        $title = '';
        if (preg_match('/<h2[^>]*>(.*?)<\/h2>/is', $html, $m)) {
            $title = self::plainFragment($m[1]);
        }

        $verseRaw = '';
        if (preg_match('/<p[^>]*>\s*<em[^>]*>\s*<strong[^>]*>(.*?)<\/strong>\s*<\/em>\s*<\/p>/is', $html, $m)) {
            $verseRaw = self::plainFragment($m[1]);
        } elseif (preg_match('/<em[^>]*>\s*<strong[^>]*>(.*?)<\/strong>\s*<\/em>/is', $html, $m)) {
            $verseRaw = self::plainFragment($m[1]);
        }

        [$verse, $citation] = self::splitVerseAndCitation($verseRaw);

        $bodyHtml = $html;
        $bodyHtml = preg_replace('/<h2[^>]*>.*?<\/h2>/is', '', $bodyHtml, 1) ?? $bodyHtml;
        $bodyHtml = preg_replace('/<p[^>]*>\s*<em[^>]*>\s*<strong[^>]*>.*?<\/strong>\s*<\/em>\s*<\/p>/is', '', $bodyHtml, 1) ?? $bodyHtml;
        $body = trim(preg_replace("/[ \t]+/u", ' ', strip_tags($bodyHtml)) ?? '');
        $body = trim(preg_replace("/\n{3,}/u", "\n\n", $body) ?? '');
        if (mb_strlen($body) > 520) {
            $body = rtrim(mb_substr($body, 0, 517)).'…';
        }

        if ($verse === '') {
            $verse = $fallback['verse'];
            $citation = $citation !== '' ? $citation : $fallback['citation'];
        }
        if ($body === '') {
            $body = $fallback['body'];
        }

        return [
            'title' => $title !== '' ? $title : $fallback['title'],
            'verse' => $verse,
            'citation' => $citation,
            'body' => $body,
        ];
    }

    /**
     * @return array{0: string, 1: string}
     */
    public static function splitVerseAndCitation(string $raw): array
    {
        $raw = trim($raw);
        $raw = trim($raw, " \t\n\r\0\x0B\"“”'");
        if ($raw === '') {
            return ['', ''];
        }

        // Ex.: …seguro.” Salmo 91:4  |  …seguro. (Salmo 91:4)
        if (preg_match(
            '/^(.*?)[\s"”\'»]*[\(]?\s*((?:[1-3]\s*)?(?:[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,3}))\s+(\d{1,3})\s*[:：]\s*(\d{1,3})(?:\s*[-–]\s*\d{1,3})?\)?\s*$/u',
            $raw,
            $m
        )) {
            $verse = trim($m[1], " \t\n\r\0\x0B\"“”'");
            $citation = trim($m[2].' '.$m[3].':'.$m[4]);

            return [$verse !== '' ? $verse : $raw, $citation];
        }

        return [$raw, ''];
    }

    private static function plainFragment(string $html): string
    {
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', $text) ?? '');
    }
}
