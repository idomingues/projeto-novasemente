<?php

namespace App\Services;

use Smalot\PdfParser\Parser as PdfParser;

class SaturdayProgramPdfParser
{
    public const VERSION = 1;

    /**
     * @return array{
     *     version: int,
     *     heading: string|null,
     *     date_label: string|null,
     *     crew: list<array{role: string, names: string}>,
     *     items: list<array<string, mixed>>
     * }
     */
    public function parseFile(string $absolutePath): array
    {
        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            throw new \RuntimeException('Arquivo PDF não encontrado ou ilegível.');
        }

        $parser = new PdfParser;
        $pdf = $parser->parseFile($absolutePath);
        $text = $pdf->getText();

        return $this->parseText($text);
    }

    /**
     * @return array{
     *     version: int,
     *     heading: string|null,
     *     date_label: string|null,
     *     crew: list<array{role: string, names: string}>,
     *     items: list<array<string, mixed>>
     * }
     */
    public function parseText(string $text): array
    {
        $text = str_replace(["\r\n", "\r", "\t"], ["\n", "\n", ' '], $text);
        $rawLines = preg_split("/\n+/", $text) ?: [];
        $lines = [];
        foreach ($rawLines as $line) {
            $line = trim(preg_replace('/\s+/u', ' ', $line) ?? '');
            if ($line === '') {
                continue;
            }
            $lines[] = $line;
        }

        $lines = $this->stripPageChrome($lines);

        $heading = null;
        $dateLabel = null;
        $crew = [];
        $items = [];
        $i = 0;
        $n = count($lines);

        // Cabeçalho + equipe até o primeiro item com horário.
        while ($i < $n) {
            $line = $lines[$i];
            if ($this->matchTimedItem($line) !== null) {
                break;
            }

            if ($heading === null && $this->looksLikeHeading($line)) {
                $heading = $line;
                $i++;
                continue;
            }

            if ($dateLabel === null && $this->looksLikeDateLabel($line)) {
                $dateLabel = $line;
                $i++;
                continue;
            }

            foreach ($this->extractCrewFromLine($line) as $row) {
                $crew[] = $row;
            }
            $i++;
        }

        while ($i < $n) {
            $line = $lines[$i];
            $timed = $this->matchTimedItem($line);

            if ($timed !== null) {
                $title = $timed['title'];
                $person = null;
                $notes = [];

                if (preg_match('/^(.*?)\s*Person:\s*(.*)$/iu', $title, $m)) {
                    $title = trim($m[1]);
                    $person = trim($m[2]);
                }

                $i++;
                while ($i < $n) {
                    $next = $lines[$i];
                    if ($this->matchTimedItem($next) !== null || $this->isSectionLine($next)) {
                        break;
                    }

                    if (preg_match('/^Person:\s*(.+)$/iu', $next, $pm)) {
                        $person = trim(($person ? $person.' ' : '').$pm[1]);
                        $i++;
                        continue;
                    }

                    if (preg_match('/^Ministro:\s*(.+)$/iu', $next, $mm)) {
                        $person = trim(($person ? $person.' · ' : '').'Ministro: '.$mm[1]);
                        $i++;
                        continue;
                    }

                    if (preg_match('/^Responsável:\s*(.+)$/iu', $next, $rm)) {
                        $person = trim(($person ? $person.' · ' : '').'Responsável: '.$rm[1]);
                        $i++;
                        continue;
                    }

                    // Continuação de Person: em linha seguinte sem prefixo.
                    if ($person !== null && preg_match('/^(Ayudes|Adriana|,)/u', $next)) {
                        $person = trim($person.' '.$next);
                        $i++;
                        continue;
                    }

                    $notes[] = $next;
                    $i++;
                }

                $title = trim($title);
                $duration = $timed['duration'];
                // Linha de total do rundown (ex.: 13:39:30 249:30) — sem título útil.
                if ($this->isRundownTotalLine($title, $duration)) {
                    continue;
                }

                $items[] = [
                    'kind' => 'item',
                    'start' => $this->normalizeTime($timed['start']),
                    'duration' => $duration,
                    'title' => $title !== '' ? $title : 'Momento',
                    'person' => $person !== null && $person !== '' ? $person : null,
                    'notes' => $notes === [] ? null : implode(' ', $notes),
                ];

                continue;
            }

            if ($this->isSectionLine($line)) {
                $items[] = [
                    'kind' => 'section',
                    'title' => $line,
                ];
                $i++;
                continue;
            }

            // Orphan note before next timed item (page break leftover) — skip.
            $i++;
        }

        if ($items === [] && $crew === []) {
            throw new \RuntimeException('Não foi possível extrair a programação deste PDF.');
        }

        return [
            'version' => self::VERSION,
            'heading' => $heading,
            'date_label' => $dateLabel,
            'crew' => $this->dedupeCrew($crew),
            'items' => $this->normalizeTimelineItems($items),
        ];
    }

    /**
     * @param  list<string>  $lines
     * @return list<string>
     */
    private function stripPageChrome(array $lines): array
    {
        $out = [];
        $n = count($lines);
        for ($i = 0; $i < $n; $i++) {
            $line = $lines[$i];

            if (preg_match('/^--\s*\d+\s+of\s+\d+\s*--$/i', $line)) {
                continue;
            }

            // Cabeçalho de página: DD/MM + horário do culto + Length/in mins/Notes
            if (preg_match('/^\d{1,2}\/\d{1,2}$/', $line)) {
                $j = $i + 1;
                if ($j < $n && preg_match('/^\d{1,2}:\d{2}$/', $lines[$j])) {
                    $j++;
                }
                while ($j < $n && preg_match('/^(Length|in mins|Notes)$/i', $lines[$j])) {
                    $j++;
                }
                $i = $j - 1;
                continue;
            }

            if (preg_match('/^(Length|in mins|Notes)$/i', $line)) {
                continue;
            }

            $out[] = $line;
        }

        return $out;
    }

    /**
     * @return array{start: string, duration: string, title: string}|null
     */
    private function matchTimedItem(string $line): ?array
    {
        // Com segundos no início: 09:26:30 3:00 Título  ou  09:26:303:00Título
        if (preg_match('/^(\d{1,2}:\d{2}:\d{2})\s*(\d{1,3}:\d{2})\s*(.*)$/u', $line, $m)) {
            return [
                'start' => $m[1],
                'duration' => $m[2],
                'title' => trim($m[3]),
            ];
        }

        // Sem segundos: 9:30 5:00 Título  ou  10:1440:00Título
        if (preg_match('/^(\d{1,2}:\d{2})\s*(\d{1,3}:\d{2})\s*(.*)$/u', $line, $m)) {
            return [
                'start' => $m[1],
                'duration' => $m[2],
                'title' => trim($m[3]),
            ];
        }

        return null;
    }

    private function normalizeTime(string $time): string
    {
        $parts = explode(':', $time);
        if (count($parts) === 2) {
            return sprintf('%02d:%02d', (int) $parts[0], (int) $parts[1]);
        }
        if (count($parts) === 3) {
            return sprintf('%02d:%02d:%02d', (int) $parts[0], (int) $parts[1], (int) $parts[2]);
        }

        return $time;
    }

    private function looksLikeHeading(string $line): bool
    {
        return (bool) preg_match('/CULTO|PROGRAMA/iu', $line);
    }

    private function looksLikeDateLabel(string $line): bool
    {
        return (bool) preg_match(
            '/^\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i',
            $line,
        ) || (bool) preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $line);
    }

    /**
     * @return list<array{role: string, names: string}>
     */
    private function extractCrewFromLine(string $line): array
    {
        $line = preg_replace('/^General Notes:\s*/iu', '', $line) ?? $line;
        $line = preg_replace('/Produção:,\s*/iu', 'Produção: ', $line) ?? $line;

        $roles = [
            'Produção',
            'Diaconato',
            'Diaconisa',
            'Recepção',
            'Técnico de Áudio',
            'Auxiliares de Áudio',
            'Direção de Vídeo',
            'Direção de Vïdeo',
            'Iluminação',
            'GC',
            'Led',
            'Cameras',
            'Câmeras',
            'Fotografia',
            'Rede social',
        ];

        $pattern = '/(' . implode('|', array_map(
            static fn (string $r) => preg_quote($r, '/'),
            $roles,
        )) . ')\s*:\s*/iu';

        if (! preg_match($pattern, $line)) {
            return [];
        }

        $parts = preg_split($pattern, $line, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        if ($parts === false || $parts === []) {
            return [];
        }

        $rows = [];
        for ($i = 0; $i < count($parts) - 1; $i += 2) {
            $role = trim($parts[$i]);
            $names = trim($parts[$i + 1] ?? '', " \t|");
            $names = trim(preg_replace('/\s*\|\s*$/u', '', $names) ?? $names);
            if ($role === '' || $names === '') {
                continue;
            }
            if (strcasecmp($role, 'Direção de Vïdeo') === 0) {
                $role = 'Direção de Vídeo';
            }
            if (strcasecmp($role, 'Cameras') === 0) {
                $role = 'Câmeras';
            }
            $rows[] = ['role' => $role, 'names' => $names];
        }

        return $rows;
    }

    private function isSectionLine(string $line): bool
    {
        if ($this->matchTimedItem($line) !== null) {
            return false;
        }
        if (preg_match('/^(Person|Ministro|Responsável|Produção|General Notes):/iu', $line)) {
            return false;
        }
        if (preg_match('/^\d+[ºª]/u', $line)) {
            return false;
        }

        // Notas longas que só mencionam conviva/culto não são divisores.
        if (mb_strlen($line) > 48) {
            return false;
        }

        // Coluna lateral do Planning Center / divisores curtos.
        return (bool) preg_match(
            '/^(PR[ÉE][-\s]?ABERTURA|BOAS VINDAS|ORAÇÃO|FIDELIDADE|ANÚNCIO|LOUVOR|MENSAGEM PASTORAL|TRANSIÇÃO|ORIENTAÇÕES DE SAÍDA|CONVIVA|INTERVALO)(\b.*)?$/iu',
            $line,
        ) || (bool) preg_match('/\b\d+[ºª]\s*CULTO\b/iu', $line);
    }

    private function isRundownTotalLine(string $title, string $duration): bool
    {
        if (! preg_match('/^\d{1,3}:\d{2}$/', $duration)) {
            return false;
        }
        $minutes = (int) explode(':', $duration)[0];
        if ($minutes < 60) {
            return false;
        }

        return $title === '' || strcasecmp($title, 'Momento') === 0;
    }

    /**
     * A coluna de fases do PDF chega em bloco após os horários da página.
     * Mantém só divisores úteis (Conviva / intervalo / troca de culto).
     *
     * @param  list<array<string, mixed>>  $items
     * @return list<array<string, mixed>>
     */
    private function normalizeTimelineItems(array $items): array
    {
        $out = [];
        $n = count($items);
        $i = 0;
        $emittedCulto = [];

        while ($i < $n) {
            $row = $items[$i];
            if (($row['kind'] ?? '') !== 'section') {
                if (($row['kind'] ?? '') === 'item'
                    && $this->isRundownTotalLine((string) ($row['title'] ?? ''), (string) ($row['duration'] ?? ''))
                ) {
                    $i++;
                    continue;
                }
                $out[] = $row;
                $i++;
                continue;
            }

            $run = [];
            while ($i < $n && ($items[$i]['kind'] ?? '') === 'section') {
                $run[] = (string) ($items[$i]['title'] ?? '');
                $i++;
            }

            foreach ($this->collapseSectionRun($run, $emittedCulto) as $title) {
                $out[] = ['kind' => 'section', 'title' => $title];
            }
        }

        return $out;
    }

    /**
     * @param  list<string>  $run
     * @param  array<string, true>  $emittedCulto
     * @return list<string>
     */
    private function collapseSectionRun(array $run, array &$emittedCulto): array
    {
        $kept = [];
        $seen = [];

        foreach ($run as $title) {
            $title = trim($title);
            if ($title === '') {
                continue;
            }

            if (preg_match('/^CONVIVA\b/iu', $title)) {
                $key = 'CONVIVA';
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $kept[] = 'CONVIVA';
                }
                continue;
            }

            if (preg_match('/INTERVALO/iu', $title)) {
                $key = 'INTERVALO';
                if (! isset($seen[$key])) {
                    $seen[$key] = true;
                    $kept[] = $title;
                }
                continue;
            }

            if (preg_match('/(\d+)[ºª]\s*CULTO/iu', $title, $m)) {
                $cultoNum = (int) $m[1];
                $cultoKey = $cultoNum.'º CULTO';
                if (isset($emittedCulto[$cultoKey]) || isset($seen[$cultoKey])) {
                    continue;
                }
                // A coluna lateral do 1º culto cai no meio do rundown — não vira divisor.
                // Só marca troca real (2º culto / pré-abertura do próximo bloco).
                if ($cultoNum >= 2 && $this->isCultoBoundaryLabel($title)) {
                    $seen[$cultoKey] = true;
                    $emittedCulto[$cultoKey] = true;
                    $kept[] = $cultoKey;
                }
                continue;
            }

            // Fases soltas da coluna lateral (ANÚNCIO, LOUVOR - …) — ignorar.
        }

        return $kept;
    }

    private function isCultoBoundaryLabel(string $title): bool
    {
        return (bool) preg_match('/PR[ÉE][-\s]?ABERTURA|TRANSIÇÃO|INTERVALO|ORGANIZA/iu', $title);
    }

    /**
     * @param  list<array{role: string, names: string}>  $crew
     * @return list<array{role: string, names: string}>
     */
    private function dedupeCrew(array $crew): array
    {
        $seen = [];
        $out = [];
        foreach ($crew as $row) {
            $key = mb_strtolower($row['role'].'|'.$row['names']);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $row;
        }

        return $out;
    }
}
