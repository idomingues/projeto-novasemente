<?php

namespace App\Services;

class BibleReferenceParser
{
    /** @var callable(string): bool */
    private $validateReference;

    /** @var callable(string): ?array{book: string, chapter: int, verses: list<int>} */
    private $parseReference;

    private ?string $bookPattern = null;

    /**
     * @param  callable(string): bool  $validateReference
     * @param  callable(string): ?array{book: string, chapter: int, verses: list<int>}  $parseReference
     */
    public function __construct(
        callable $validateReference,
        callable $parseReference,
        private readonly ?BibleBookCatalog $catalog = null,
    ) {
        $this->validateReference = $validateReference;
        $this->parseReference = $parseReference;
    }

    /**
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    public function findAllInText(string $text): array
    {
        if ($text === '' || ! preg_match('/[A-Za-zÀ-ÿ]\s*\d/u', $text)) {
            return [];
        }

        $matches = [];
        $parenRanges = [];

        if (preg_match_all('/\(([^)]*)\)/u', $text, $groups, PREG_OFFSET_CAPTURE)) {
            foreach ($groups[0] as $i => $groupFull) {
                $fullDisplay = (string) ($groupFull[0] ?? '');
                $groupByteOffset = (int) ($groupFull[1] ?? 0);
                $groupCharOffset = $this->byteOffsetToChar($text, $groupByteOffset);
                $groupCharLength = mb_strlen($fullDisplay);
                $parenRanges[] = [$groupCharOffset, $groupCharOffset + $groupCharLength];

                $inner = (string) ($groups[1][$i][0] ?? '');
                foreach ($this->matchesFromParenGroup($text, $groupCharOffset, $fullDisplay, $inner) as $match) {
                    $matches[] = $match;
                }
            }
        }

        $tokenPattern = $this->referenceTokenPattern();

        if (preg_match_all(
            '/(?<![A-Za-zÀ-ÿ])(?P<inner>'.$tokenPattern.')(?=$|[,;.\)!?»"”\x{2013}\x{2014}]|\s+(?![\de]))/iu',
            $text,
            $plainMatches,
            PREG_OFFSET_CAPTURE
        )) {
            foreach ($plainMatches[0] as $i => $full) {
                $display = (string) ($full[0] ?? '');
                $byteOffset = (int) ($full[1] ?? 0);
                $charOffset = $this->byteOffsetToChar($text, $byteOffset);
                $inner = trim((string) ($plainMatches['inner'][$i][0] ?? ''));

                if ($display === '' || $inner === '' || ! $this->isValidReference($inner)) {
                    continue;
                }

                if ($this->offsetInsideRange($charOffset, $parenRanges)) {
                    continue;
                }

                $length = mb_strlen($display);
                if ($this->matchOverlaps($matches, $charOffset, $length)) {
                    continue;
                }

                $matches[] = [
                    'offset' => $charOffset,
                    'length' => $length,
                    'inner' => $inner,
                    'display' => $display,
                ];
            }
        }

        foreach ($this->findPlainSemicolonChains($text, $parenRanges, $tokenPattern) as $chainMatch) {
            $offset = (int) $chainMatch['offset'];
            $length = (int) $chainMatch['length'];
            if (! $this->matchOverlaps($matches, $offset, $length)) {
                $matches[] = $chainMatch;
            }
        }

        $matches = $this->dedupeOverlaps($matches);
        usort($matches, fn (array $a, array $b): int => $a['offset'] <=> $b['offset']);

        return $matches;
    }

    /**
     * @return array{book: string, chapter: int, verses: list<int>}|null
     */
    public function parseReferenceString(string $reference): ?array
    {
        return ($this->parseReference)($reference);
    }

    /**
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    private function matchesFromParenGroup(
        string $text,
        int $groupCharOffset,
        string $fullParen,
        string $inner,
    ): array {
        $inner = trim($inner);
        if ($inner === '') {
            return [];
        }

        $working = preg_replace('/^(?:veja|cf\.?|conf\.?|compare)\s+/iu', '', $inner) ?? $inner;
        $working = trim($working);

        if ($working === '') {
            return [];
        }

        $innerCharStart = $groupCharOffset + 1;

        if (str_contains($working, ';')) {
            return $this->fragmentSemicolonMatches($text, $inner, $innerCharStart);
        }

        if ($this->isValidReference($working)) {
            $inner = $this->cleanReferenceSegment($working);

            return [[
                'offset' => $groupCharOffset,
                'length' => mb_strlen($fullParen),
                'inner' => $inner,
                'display' => $fullParen,
            ]];
        }

        $cleaned = $this->cleanReferenceSegment($working);
        if ($cleaned !== $working && $cleaned !== '' && $this->isValidReference($cleaned)) {
            $innerStart = $groupCharOffset + 1 + mb_strpos($inner, $cleaned);

            return [[
                'offset' => $innerStart,
                'length' => mb_strlen($cleaned),
                'inner' => $cleaned,
                'display' => $cleaned,
            ]];
        }

        return $this->fragmentTokenMatches($inner, $innerCharStart);
    }

    /**
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    private function fragmentSemicolonMatches(string $text, string $fragment, int $baseCharOffset): array
    {
        $matches = [];
        $working = preg_replace('/^(?:veja|cf\.?|conf\.?|compare)\s+/iu', '', $fragment) ?? $fragment;
        $working = trim($working);
        $lastBook = null;
        $searchFrom = 0;

        foreach (preg_split('/\s*;\s*/u', $working, -1, PREG_SPLIT_NO_EMPTY) as $segment) {
            $segment = trim($segment);
            if ($segment === '') {
                continue;
            }

            $relativePos = mb_strpos($fragment, $segment, $searchFrom);
            if ($relativePos === false) {
                continue;
            }

            $resolved = $this->resolveFragmentSegment($segment, $lastBook);
            if ($resolved === null) {
                continue;
            }

            $lastBook = $resolved['book'];
            $matches[] = [
                'offset' => $baseCharOffset + $relativePos,
                'length' => mb_strlen($resolved['display']),
                'inner' => $resolved['inner'],
                'display' => $resolved['display'],
            ];
            $searchFrom = $relativePos + mb_strlen($segment);
        }

        return $matches;
    }

    /**
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    private function fragmentTokenMatches(string $fragment, int $baseCharOffset): array
    {
        $matches = [];
        $tokenPattern = $this->referenceTokenPattern();

        if (! preg_match_all('/(?P<inner>'.$tokenPattern.')/iu', $fragment, $found, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($found[0] as $i => $full) {
            $display = (string) ($full[0] ?? '');
            $byteOffset = (int) ($full[1] ?? 0);
            $charOffset = $this->byteOffsetToChar($fragment, $byteOffset);
            $inner = trim((string) ($found['inner'][$i][0] ?? ''));

            if ($display === '' || $inner === '' || ! $this->isValidReference($inner)) {
                continue;
            }

            $length = mb_strlen($display);
            if ($this->matchOverlaps($matches, $baseCharOffset + $charOffset, $length)) {
                continue;
            }

            $matches[] = [
                'offset' => $baseCharOffset + $charOffset,
                'length' => $length,
                'inner' => $inner,
                'display' => $display,
            ];
        }

        return $matches;
    }

    /**
     * @return array{book: string, inner: string, display: string}|null
     */
    private function resolveFragmentSegment(string $segment, ?string $lastBook): ?array
    {
        $segment = $this->cleanReferenceSegment($segment);
        if ($segment === '') {
            return null;
        }

        $tokenPattern = $this->referenceTokenPattern();

        if (preg_match('/^(?P<inner>'.$tokenPattern.')$/iu', $segment, $m)) {
            $inner = trim((string) ($m['inner'] ?? ''));
            if ($inner === '' || ! $this->isValidReference($inner)) {
                return null;
            }
            $parsed = ($this->parseReference)($inner);

            return [
                'book' => $this->bookPrefixFromReference($inner) ?? (string) ($parsed['book'] ?? ''),
                'inner' => $inner,
                'display' => $segment,
            ];
        }

        if ($lastBook !== null && preg_match('/^(?<chapter>\d+)(?:\s*:\s*(?<versePart>[\d,\s\-–e]+[a-zA-Z]?))?$/iu', $segment, $m)) {
            $inner = trim($lastBook.' '.$segment);
            if (! $this->isValidReference($inner)) {
                return null;
            }

            return [
                'book' => $lastBook,
                'inner' => $inner,
                'display' => $segment,
            ];
        }

        return null;
    }

    private function bookPrefixFromReference(string $reference): ?string
    {
        if ($this->catalog === null) {
            return null;
        }

        $matched = null;
        $matchedLen = 0;
        foreach ($this->catalog->matchTokens() as $token) {
            $token = trim($token);
            if ($token === '') {
                continue;
            }

            if (! preg_match('/^('.preg_quote($token, '/').')(\s)/iu', $reference, $m)) {
                continue;
            }

            $len = mb_strlen($m[1]);
            if ($len > $matchedLen) {
                $matched = $m[1];
                $matchedLen = $len;
            }
        }

        return $matched;
    }

    /**
     * @param  list<array{0: int, 1: int}>  $parenRanges
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    private function findPlainSemicolonChains(string $text, array $parenRanges, string $tokenPattern): array
    {
        $implicitSegment = '\d+(?:\s*:\s*[\d,\s\-–e]+[a-zA-Z]?)?';
        $chainPattern = '(?:'.$tokenPattern.'|'.$implicitSegment.')(?:\s*;\s*(?:'.$tokenPattern.'|'.$implicitSegment.'))+';

        if (! preg_match_all(
            '/(?<![A-Za-zÀ-ÿ(])(?P<chain>'.$chainPattern.')(?=$|[,;.\)!?»"”\x{2013}\x{2014}]|\s+(?![\de]))/iu',
            $text,
            $chains,
            PREG_OFFSET_CAPTURE
        )) {
            return [];
        }

        $matches = [];
        foreach ($chains[0] as $i => $full) {
            $chainText = (string) ($full[0] ?? '');
            $byteOffset = (int) ($full[1] ?? 0);
            $charOffset = $this->byteOffsetToChar($text, $byteOffset);

            if ($chainText === '' || $this->offsetInsideRange($charOffset, $parenRanges)) {
                continue;
            }

            foreach ($this->fragmentSemicolonMatches($text, $chainText, $charOffset) as $match) {
                $matches[] = $match;
            }
        }

        return $matches;
    }

    private function cleanReferenceSegment(string $segment): string
    {
        $segment = trim($segment);
        if ($segment === '') {
            return '';
        }

        $segment = preg_replace(
            '/,\s*(?:NVI|NAA|ARA|ACF|NBV|NTLH|ARC|KJV|NIV|CPB|TB|NVT|AS21)(?:\s+ed\.?)?$/iu',
            '',
            $segment
        ) ?? $segment;

        return trim($segment);
    }

    private function referenceTokenPattern(): string
    {
        $bookPattern = $this->bookPattern ??= $this->catalog?->bookPatternForRegex()
            ?? '(?:\d+\s*[A-Za-zÀ-ÿ]{1,5}|\d+\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*|[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)';
        $versePattern = '(?:\s*:\s*[\d,\s\-–]+(?:\s+e\s+[\d,\s\-–]+)*[a-zA-Z]?)?';

        return $bookPattern.'\s+\d+'.$versePattern;
    }

    private function isValidReference(string $inner): bool
    {
        return ($this->validateReference)($inner);
    }

    private function byteOffsetToChar(string $text, int $byteOffset): int
    {
        if ($byteOffset <= 0) {
            return 0;
        }

        return mb_strlen(mb_strcut($text, 0, $byteOffset, 'UTF-8'));
    }

    /**
     * @param  list<array{0: int, 1: int}>  $ranges
     */
    private function offsetInsideRange(int $offset, array $ranges): bool
    {
        foreach ($ranges as $range) {
            if ($offset >= $range[0] && $offset < $range[1]) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array{offset: int, length: int, inner: string, display: string}>  $matches
     */
    private function matchOverlaps(array $matches, int $offset, int $length): bool
    {
        $end = $offset + $length;
        foreach ($matches as $match) {
            $matchEnd = (int) $match['offset'] + (int) $match['length'];
            if ($offset < $matchEnd && $end > (int) $match['offset']) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array{offset: int, length: int, inner: string, display: string}>  $matches
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    private function dedupeOverlaps(array $matches): array
    {
        if ($matches === []) {
            return [];
        }

        usort($matches, function (array $a, array $b): int {
            $lenA = (int) $a['length'];
            $lenB = (int) $b['length'];
            if ($lenB !== $lenA) {
                return $lenB <=> $lenA;
            }

            return $a['offset'] <=> $b['offset'];
        });

        $kept = [];
        foreach ($matches as $candidate) {
            $offset = (int) $candidate['offset'];
            $length = (int) $candidate['length'];
            if (! $this->matchOverlaps($kept, $offset, $length)) {
                $kept[] = $candidate;
            }
        }

        return $kept;
    }
}
