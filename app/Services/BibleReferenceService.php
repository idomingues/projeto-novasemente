<?php

namespace App\Services;

use App\Models\BibleBook;
use App\Models\BibleVerse;

class BibleReferenceService
{
    private ?BibleBookCatalog $catalog = null;

    private ?BibleReferenceParser $parser = null;

    private ?BibleReferenceLinkifier $linkifier = null;

    public function __construct(
        private readonly PromiseBoxVerseService $verseService,
    ) {}

    public function bibleReady(): bool
    {
        return $this->verseService->bibleReady();
    }

    /**
     * @return array{ref: string, book: string, chapter: int, verses: list<array{verse: int, text: string}>}|null
     */
    public function resolveReferenceString(string $reference): ?array
    {
        if (! $this->bibleReady()) {
            return null;
        }

        $parsed = $this->parseReferenceString($reference);
        if ($parsed === null) {
            return null;
        }

        $book = $this->catalog()->resolveBook($parsed['book']);
        if (! $book instanceof BibleBook) {
            return null;
        }

        $chapter = $parsed['chapter'];
        if ($chapter < 1 || $chapter > (int) $book->chapters_count) {
            return null;
        }

        $verseNumbers = $parsed['verses'];
        $query = BibleVerse::query()
            ->where('book_id', (int) $book->id)
            ->where('chapter', $chapter)
            ->orderBy('verse');

        if ($verseNumbers !== []) {
            $query->whereIn('verse', $verseNumbers);
        }

        $rows = $query->get(['verse', 'text']);
        if ($rows->isEmpty()) {
            return null;
        }

        $verses = $rows->map(fn (BibleVerse $v) => [
            'verse' => (int) $v->verse,
            'text' => trim((string) $v->text),
        ])->values()->all();

        $ref = $this->formatDisplayRef((string) $book->name, $chapter, $verseNumbers);

        return [
            'ref' => $ref,
            'book' => (string) $book->name,
            'chapter' => $chapter,
            'verses' => $verses,
        ];
    }

    public function linkifyLessonHtml(string $html): string
    {
        if (! $this->bibleReady() || trim($html) === '') {
            return $html;
        }

        return $this->linkifier()->linkifyHtml($html);
    }

    public function linkifyPlainText(string $text): string
    {
        $text = trim($text);
        if ($text === '' || ! $this->bibleReady()) {
            return '';
        }

        $escaped = htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return $this->linkifyLessonHtml('<p>'.$escaped.'</p>');
    }

    /**
     * @return list<array{offset: int, length: int, inner: string, display: string}>
     */
    public function findReferenceMatches(string $text): array
    {
        return $this->parser()->findAllInText($text);
    }

    /**
     * @return array{book: string, chapter: int, verses: list<int>}|null
     */
    public function parseReferenceString(string $reference): ?array
    {
        $reference = $this->normalizeReferenceForParse($reference);

        if ($reference === '') {
            return null;
        }

        $book = $this->matchBookTokenFromReference($reference);
        if ($book !== null) {
            $remainder = trim(mb_substr($reference, mb_strlen($book)));
            if (preg_match('/^(?<chapter>\d+)(?:\s*:\s*(?<versePart>[\d,\s\-–e]+[a-zA-Z]?))?$/u', $remainder, $m)) {
                $chapter = (int) ($m['chapter'] ?? 0);
                if ($chapter > 0) {
                    $versePart = trim((string) ($m['versePart'] ?? ''));
                    $versePart = $this->cleanVersePart($versePart);
                    $verses = $versePart !== '' ? $this->expandVerseNumbers($versePart) : [];

                    return [
                        'book' => $book,
                        'chapter' => $chapter,
                        'verses' => $verses,
                    ];
                }
            }
        }

        $bookPattern = '(?:\d+\s*[A-Za-zÀ-ÿ]{1,5}|\d+\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*|[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*)';
        $versePattern = '(?:\s*:\s*(?<versePart>[\d,\s\-–]+(?:\s+e\s+[\d,\s\-–]+)*[a-zA-Z]?))?';

        if (! preg_match(
            '/^(?<book>'.$bookPattern.')\s+(?<chapter>\d+)'.$versePattern.'$/u',
            $reference,
            $m
        )) {
            return null;
        }

        $book = trim((string) ($m['book'] ?? ''));
        $chapter = (int) ($m['chapter'] ?? 0);
        if ($book === '' || $chapter <= 0) {
            return null;
        }

        $versePart = trim((string) ($m['versePart'] ?? ''));
        $versePart = $this->cleanVersePart($versePart);
        $verses = $versePart !== '' ? $this->expandVerseNumbers($versePart) : [];

        return [
            'book' => $book,
            'chapter' => $chapter,
            'verses' => $verses,
        ];
    }

    private function catalog(): BibleBookCatalog
    {
        if ($this->catalog === null) {
            $this->catalog = new BibleBookCatalog($this->verseService);
        }

        return $this->catalog;
    }

    private function parser(): BibleReferenceParser
    {
        if ($this->parser === null) {
            $this->parser = new BibleReferenceParser(
                fn (string $ref): bool => $this->resolveReferenceString($ref) !== null,
                fn (string $ref): ?array => $this->parseReferenceString($ref),
                $this->catalog(),
            );
        }

        return $this->parser;
    }

    private function linkifier(): BibleReferenceLinkifier
    {
        if ($this->linkifier === null) {
            $this->linkifier = new BibleReferenceLinkifier($this->parser());
        }

        return $this->linkifier;
    }

    private function cleanVersePart(string $part): string
    {
        $part = trim($part);
        if ($part === '') {
            return '';
        }

        return preg_replace('/(\d)[a-zA-Z]+(?=[,\-–\s]|$)/u', '$1', $part) ?? $part;
    }

    /**
     * @return list<int>
     */
    private function expandVerseNumbers(string $part): array
    {
        $nums = [];
        $segments = preg_split('/\s*,\s*|\s+e\s+/iu', $part) ?: [];

        foreach ($segments as $segment) {
            $segment = trim($segment);
            if ($segment === '') {
                continue;
            }

            if (preg_match('/^(?<a>\d+)\s*[-–]\s*(?<b>\d+)$/u', $segment, $m)) {
                $start = (int) $m['a'];
                $end = (int) $m['b'];
                if ($end < $start) {
                    [$start, $end] = [$end, $start];
                }
                for ($v = $start; $v <= $end; $v++) {
                    $nums[] = $v;
                }
                continue;
            }

            if (preg_match('/^\d+$/u', $segment)) {
                $nums[] = (int) $segment;
            }
        }

        $nums = array_values(array_unique($nums));
        sort($nums, SORT_NUMERIC);

        return $nums;
    }

    /**
     * @param  list<int>  $verseNumbers
     */
    private function formatDisplayRef(string $bookName, int $chapter, array $verseNumbers): string
    {
        if ($verseNumbers === []) {
            return sprintf('%s %d', $bookName, $chapter);
        }

        if (count($verseNumbers) === 1) {
            return sprintf('%s %d:%d', $bookName, $chapter, $verseNumbers[0]);
        }

        $first = $verseNumbers[0];
        $last = $verseNumbers[count($verseNumbers) - 1];
        $contiguous = count($verseNumbers) === ($last - $first + 1);

        if ($contiguous) {
            return sprintf('%s %d:%d-%d', $bookName, $chapter, $first, $last);
        }

        return sprintf('%s %d:%s', $bookName, $chapter, implode(', ', $verseNumbers));
    }

    private function normalizeReferenceForParse(string $reference): string
    {
        $reference = trim($reference);
        $reference = trim($reference, " \t\n\r\0\x0B()");
        $reference = preg_replace('/\s+/u', ' ', $reference) ?? $reference;
        $reference = preg_replace(
            '/,\s*(?:NVI|NAA|ARA|ACF|NBV|NTLH|ARC|KJV|NIV|CPB|TB|NVT|AS21)(?:\s+ed\.?)?$/iu',
            '',
            $reference
        ) ?? $reference;

        return trim($reference);
    }

    private function matchBookTokenFromReference(string $reference): ?string
    {
        $matched = null;
        foreach ($this->catalog()->matchTokens() as $token) {
            $token = trim($token);
            if ($token === '') {
                continue;
            }

            if (! preg_match('/^'.preg_quote($token, '/').'\s/iu', $reference)) {
                continue;
            }

            if ($matched === null || mb_strlen($token) > mb_strlen($matched)) {
                $matched = $token;
            }
        }

        return $matched;
    }
}
