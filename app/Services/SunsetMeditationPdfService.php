<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SunsetMeditationPdfService
{
    /** @var array<string, int> */
    private const MONTHS = [
        'JANEIRO' => 1,
        'FEVEREIRO' => 2,
        'MARÇO' => 3,
        'MARCO' => 3,
        'ABRIL' => 4,
        'MAIO' => 5,
        'JUNHO' => 6,
        'JULHO' => 7,
        'AGOSTO' => 8,
        'SETEMBRO' => 9,
        'OUTUBRO' => 10,
        'NOVEMBRO' => 11,
        'DEZEMBRO' => 12,
    ];

    private const MONTH_PATTERN = 'JANEIRO|FEVEREIRO|MAR[CÇ]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO';

    /**
     * @return array{ok: bool, segments?: list<array{slug: string, label: string, date: string, html: string}>, year?: int, error?: string}
     */
    public function parseStoredPdf(string $relativePath, ?int $year = null): array
    {
        $disk = Storage::disk('public');
        if (! $disk->exists($relativePath)) {
            return ['ok' => false, 'error' => 'Arquivo PDF não encontrado.'];
        }

        $absolutePath = $disk->path($relativePath);
        $text = $this->extractText($absolutePath);
        if ($text === null) {
            return ['ok' => false, 'error' => 'Não foi possível ler o PDF. Confira se o utilitário pdftotext está instalado no servidor.'];
        }

        $resolvedYear = $year ?? $this->inferYearFromPath($relativePath) ?? (int) now()->format('Y');
        $segments = $this->parseSegments($text, $resolvedYear);
        if ($segments === []) {
            return ['ok' => false, 'error' => 'Não foi possível identificar meditações por data no PDF.'];
        }

        return [
            'ok' => true,
            'segments' => $segments,
            'year' => $resolvedYear,
        ];
    }

    /**
     * @param  list<array{slug: string, label: string, date: string, html: string}>  $segments
     */
    public function resolveDefaultIndex(array $segments, ?Carbon $now = null): int
    {
        if ($segments === []) {
            return 0;
        }

        $now = ($now ?? now())->copy()->startOfDay();
        $targetFriday = $now->isFriday()
            ? $now->copy()
            : $now->copy()->next(Carbon::FRIDAY);

        $targetKey = $targetFriday->toDateString();
        foreach ($segments as $index => $segment) {
            if (($segment['date'] ?? '') === $targetKey) {
                return $index;
            }
        }

        $fallback = 0;
        foreach ($segments as $index => $segment) {
            $date = $segment['date'] ?? '';
            if ($date !== '' && $date >= $targetKey) {
                return $index;
            }
            $fallback = $index;
        }

        return $fallback;
    }

    /**
     * @return list<array{slug: string, label: string, date: string, html: string}>
     */
    public function parseSegments(string $text, int $year): array
    {
        $normalized = $this->normalizeExtractedText($text);
        $pattern = '/(\d{1,2})\s+DE\s+('.self::MONTH_PATTERN.')/iu';

        if (! preg_match_all($pattern, $normalized, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        $count = count($matches[0]);
        $segments = [];

        for ($i = 0; $i < $count; $i++) {
            $day = (int) $matches[1][$i][0];
            $monthName = $this->normalizeMonthToken((string) $matches[2][$i][0]);
            $month = self::MONTHS[$monthName] ?? null;
            if ($month === null) {
                continue;
            }

            $start = (int) $matches[0][$i][1];
            $end = $i + 1 < $count ? (int) $matches[0][$i + 1][1] : strlen($normalized);
            $chunk = trim(substr($normalized, $start, max(0, $end - $start)));
            if ($chunk === '') {
                continue;
            }

            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
            if (! $this->isValidDate($year, $month, $day)) {
                continue;
            }

            $parsed = $this->parseSegmentChunk($chunk, $day, $monthName);
            if ($parsed === null) {
                continue;
            }

            $segments[] = [
                'slug' => $date,
                'label' => $this->shortDateLabel($day, $month),
                'date' => $date,
                'html' => $this->segmentToHtml($parsed['title'], $parsed['verse'], $parsed['body'], $day, $monthName),
            ];
        }

        return $segments;
    }

    private function extractText(string $absolutePath): ?string
    {
        if (! is_readable($absolutePath)) {
            return null;
        }

        $result = Process::timeout(30)->run(['pdftotext', '-layout', $absolutePath, '-']);
        if ($result->successful()) {
            $text = trim($result->output());
            if ($text !== '') {
                return $text;
            }
        }

        return null;
    }

    private function normalizeExtractedText(string $text): string
    {
        $text = str_replace("\f", "\n", $text);
        $text = preg_replace('/(\d+)\s*\n+\s*(DE\s+(?:'.self::MONTH_PATTERN.'))/iu', '$1 $2', $text) ?? $text;
        $text = preg_replace('/(\d+)\s*O\s+D\s+E\s+M\s+A\s+I\s+O/iu', '$1 DE MAIO', $text) ?? $text;

        return $text;
    }

    /**
     * @return array{title: string, verse: string, body: string}|null
     */
    private function parseSegmentChunk(string $chunk, int $day, string $monthName): ?array
    {
        $chunk = preg_replace('/^(\d{1,2})\s+DE\s+'.preg_quote($monthName, '/').'\s*/iu', '', $chunk) ?? $chunk;
        $lines = $this->rawContentLines($chunk);
        if ($lines === []) {
            return null;
        }

        $verseIdx = null;
        foreach ($lines as $index => $line) {
            if (preg_match('/\d+:\d+/u', $line)) {
                $verseIdx = $index;
                break;
            }
        }

        if ($verseIdx === null) {
            return null;
        }

        $title = trim(implode(' ', array_slice($lines, 0, $verseIdx)));
        $verse = trim($lines[$verseIdx]);
        $body = trim($this->mergeBodyParagraphs(array_slice($lines, $verseIdx + 1)));

        if ($title === '' || $body === '') {
            return null;
        }

        return [
            'title' => $title,
            'verse' => $verse,
            'body' => $body,
        ];
    }

    /**
     * @return list<string>
     */
    private function rawContentLines(string $text): array
    {
        $rawLines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $merged = [];
        $count = count($rawLines);

        for ($i = 0; $i < $count; $i++) {
            $line = trim($rawLines[$i]);
            if ($line === '') {
                continue;
            }

            if ($this->isNoiseLine($line)) {
                continue;
            }

            if (preg_match('/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]$/u', $line) && $i + 1 < $count) {
                $next = trim($rawLines[$i + 1]);
                if ($next !== '' && ! $this->isNoiseLine($next)) {
                    $merged[] = $line.$next;
                    $i++;

                    continue;
                }
            }

            $merged[] = $line;
        }

        return $merged;
    }

    /**
     * @param  list<string>  $lines
     */
    private function mergeBodyParagraphs(array $lines): string
    {
        $paragraphs = [];
        $buffer = '';

        foreach ($lines as $line) {
            if ($buffer === '') {
                $buffer = $line;

                continue;
            }

            if ($this->looksLikeParagraphBreak($buffer, $line)) {
                $paragraphs[] = $buffer;
                $buffer = $line;

                continue;
            }

            $buffer .= ' '.$line;
        }

        if ($buffer !== '') {
            $paragraphs[] = $buffer;
        }

        return implode("\n\n", $paragraphs);
    }

    private function isNoiseLine(string $line): bool
    {
        if (preg_match('/^–\s*Meditação Por do Sol/ui', $line)) {
            return true;
        }

        if (preg_match('/^P\d+/i', $line)) {
            return true;
        }

        if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}/', $line)) {
            return true;
        }

        return (bool) preg_match('/^\d{1,2}$/', $line);
    }

    private function looksLikeParagraphBreak(string $previous, string $next): bool
    {
        if (preg_match('/[.!?…"»)]$/u', $previous)) {
            return true;
        }

        if (preg_match('/^(Agora reflita:|Mas |Por outro lado|Em contrapartida|Hoje|Que |Em meio)/u', $next)) {
            return true;
        }

        return false;
    }

    private function segmentToHtml(string $title, string $verse, string $body, int $day, string $monthName): string
    {
        $dateHeading = htmlspecialchars($this->longDateLabel($day, $monthName), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $titleHtml = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $verseHtml = htmlspecialchars($verse, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $paragraphs = preg_split("/\n\n+/u", $body) ?: [];
        $bodyHtml = '';
        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if ($paragraph === '') {
                continue;
            }
            $bodyHtml .= '<p>'.nl2br(htmlspecialchars($paragraph, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), false).'</p>';
        }

        return '<h2>'.$dateHeading.'</h2><h3>'.$titleHtml.'</h3><p><em>'.$verseHtml.'</em></p>'.$bodyHtml;
    }

    private function shortDateLabel(int $day, int $month): string
    {
        $months = ['', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

        return $day.' '.($months[$month] ?? '');
    }

    private function longDateLabel(int $day, string $monthName): string
    {
        return $day.' de '.Str::lower($this->normalizeMonthToken($monthName));
    }

    private function normalizeMonthToken(string $monthName): string
    {
        $monthName = Str::upper(Str::ascii(trim($monthName)));
        if ($monthName === 'MARCO') {
            return 'MARÇO';
        }

        return $monthName;
    }

    private function inferYearFromPath(string $path): ?int
    {
        if (preg_match('/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/', $path, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    private function isValidDate(int $year, int $month, int $day): bool
    {
        return checkdate($month, $day, $year);
    }
}
