<?php

namespace App\Services;

use App\Models\BibleBook;
use Illuminate\Support\Str;

class BibleBookCatalog
{
    /** @var array<string, BibleBook>|null */
    private ?array $booksByKey = null;

    /** @var array<string, string>|null norm => book key */
    private ?array $aliasToKey = null;

    /** @var list<string>|null longest-first book tokens for matching */
    private ?array $bookTokens = null;

    public function __construct(
        private readonly PromiseBoxVerseService $verseService,
    ) {}

    public function ready(): bool
    {
        return $this->verseService->bibleReady();
    }

    public function resolveBook(string $input): ?BibleBook
    {
        $input = trim($input);
        if ($input === '' || ! $this->ready()) {
            return null;
        }

        $this->load();

        // CPB: «Jo» sem acento = Evangelho de João (antes de resolveBookName — Jó e João colidem em «jo»).
        if (preg_match('/^jo$/iu', $input)) {
            $john = $this->findGospelOfJohn();
            if ($john instanceof BibleBook) {
                return $john;
            }
        }

        $byName = $this->verseService->resolveBookName($input);
        if ($byName !== null) {
            foreach ($this->booksByKey ?? [] as $book) {
                if ((string) $book->name === $byName) {
                    return $book;
                }
            }
        }

        if ($this->isJobBookHint($input)) {
            return $this->findJobBook();
        }

        $lowerInput = mb_strtolower($input, 'UTF-8');
        foreach ($this->booksByKey ?? [] as $book) {
            if (mb_strtolower((string) $book->abbrev, 'UTF-8') === $lowerInput) {
                if ($lowerInput === 'jo' && $this->isJobBookName((string) $book->name)) {
                    continue;
                }

                return $book;
            }
        }

        $norm = $this->normToken($input);
        $aliasKey = $this->aliasToKey()[$norm] ?? null;
        if ($aliasKey !== null && isset($this->booksByKey[$aliasKey])) {
            return $this->booksByKey[$aliasKey];
        }

        foreach ($this->booksByKey ?? [] as $book) {
            if ($this->normToken((string) $book->name) === $norm) {
                return $book;
            }
        }

        return null;
    }

    /**
     * @return list<string> tokens longest first (e.g. "1 Co" before "Co")
     */
    public function bookTokens(): array
    {
        $this->load();

        return $this->bookTokens ?? [];
    }

    /**
     * @return list<string>
     */
    public function matchTokens(): array
    {
        $this->load();

        $tokens = $this->bookTokens ?? [];
        foreach ($this->booksByKey ?? [] as $book) {
            foreach ($this->generateCpbAliases($book) as $alias) {
                $tokens[] = $alias;
            }
        }

        $tokens = array_values(array_unique(array_filter(array_map('trim', $tokens))));
        usort($tokens, fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));

        return $tokens;
    }

    /**
     * Alternation of known book tokens for regex matching (longest first).
     */
    public function bookPatternForRegex(): string
    {
        $parts = array_map(
            static fn (string $token): string => preg_quote($token, '/'),
            $this->matchTokens()
        );

        return $parts === [] ? '[A-Za-zÀ-ÿ]+' : '(?i)(?:'.implode('|', $parts).')';
    }

    private function load(): void
    {
        if (is_array($this->booksByKey)) {
            return;
        }

        $this->booksByKey = [];
        $tokens = [];

        foreach (BibleBook::query()->orderBy('position')->get() as $book) {
            $this->booksByKey[(string) $book->key] = $book;
            $tokens[] = (string) $book->abbrev;
            $tokens[] = (string) $book->name;
        }

        $tokens = array_values(array_unique(array_filter($tokens)));
        usort($tokens, fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
        $this->bookTokens = $tokens;
    }

    /**
     * @return array<string, string>
     */
    private function aliasToKey(): array
    {
        if (is_array($this->aliasToKey)) {
            return $this->aliasToKey;
        }

        $this->load();
        $this->aliasToKey = [];

        foreach ($this->booksByKey ?? [] as $book) {
            $key = (string) $book->key;
            $abbrev = (string) $book->abbrev;
            $this->aliasToKey[$this->normToken((string) $book->name)] = $key;

            foreach ($this->generateCpbAliases($book) as $alias) {
                $this->aliasToKey[$this->normToken($alias)] = $key;
            }

            $cpbAliases = match ($key) {
                'atos', 'at' => ['at'],
                'ap' => ['ap'],
                'is' => ['is'],
                'et' => ['eet'],
                'mt' => ['mt'],
                'cl' => ['cl'],
                'tg' => ['tg'],
                default => [],
            };

            foreach ($cpbAliases as $alias) {
                $this->aliasToKey[$this->normToken($alias)] = $key;
            }

            if ($key === 'jo' && mb_strtolower($abbrev, 'UTF-8') === 'jó') {
                $this->aliasToKey['job'] = $key;
            }
            if (str_starts_with($key, 'jo-') || str_contains($key, 'joao')) {
                $this->aliasToKey['joao'] = $key;
            }

            if (! $this->isJobBookHint($abbrev)) {
                $this->aliasToKey[$this->normToken($abbrev)] = $key;
            }
        }

        $john = $this->findGospelOfJohn();
        if ($john instanceof BibleBook) {
            $this->aliasToKey['jo'] = (string) $john->key;
        }

        return $this->aliasToKey;
    }

    private function findGospelOfJohn(): ?BibleBook
    {
        foreach ($this->booksByKey ?? [] as $book) {
            if ($this->isGospelOfJohnBook($book)) {
                return $book;
            }
        }

        return null;
    }

    private function isGospelOfJohnBook(BibleBook $book): bool
    {
        if ($this->isJobBookName((string) $book->name)) {
            return false;
        }

        $name = Str::lower(Str::ascii(trim((string) $book->name)));
        if (preg_match('/^\d+\s/u', (string) $book->name)) {
            return false;
        }

        if (str_contains($name, 'joao')) {
            return true;
        }

        if ((string) $book->testament === 'new' && (int) $book->position === 43) {
            return true;
        }

        return (string) $book->testament === 'new'
            && mb_strtolower((string) $book->abbrev, 'UTF-8') === 'jo';
    }

    private function findJobBook(): ?BibleBook
    {
        foreach ($this->booksByKey ?? [] as $book) {
            if ($this->isJobBookName((string) $book->name)) {
                return $book;
            }
        }

        return null;
    }

    private function isJobBookName(string $name): bool
    {
        $norm = Str::lower(Str::ascii(trim($name)));

        return $norm === 'jo' || $norm === 'job';
    }

    private function isJobBookHint(string $input): bool
    {
        if (preg_match('/[óôõ]/iu', $input)) {
            return true;
        }

        return preg_match('/^j[oó]b$/iu', $input) === 1;
    }

    /**
     * @return list<string>
     */
    private function generateCpbAliases(BibleBook $book): array
    {
        $aliases = [];
        $name = (string) $book->name;

        if (preg_match('/^(\d+)\s+(.+)$/u', $name, $m)) {
            $num = $m[1];
            $lettersOnly = preg_replace('/[^a-z]/u', '', Str::lower(Str::ascii(trim($m[2])))) ?? '';
            if ($lettersOnly !== '') {
                foreach ([2, 3, 4, 5] as $len) {
                    if (strlen($lettersOnly) >= $len) {
                        $aliases[] = $num.substr($lettersOnly, 0, $len);
                    }
                }
                $aliases[] = $num.$lettersOnly;
            }
        } else {
            $lettersOnly = preg_replace('/[^a-z]/u', '', Str::lower(Str::ascii($name))) ?? '';
            if (strlen($lettersOnly) >= 2) {
                $aliases[] = substr($lettersOnly, 0, 2);
            }
            if (strlen($lettersOnly) >= 3) {
                $aliases[] = substr($lettersOnly, 0, 3);
            }
        }

        return array_values(array_unique(array_filter($aliases)));
    }

    private function normToken(string $value): string
    {
        $value = trim($value);
        $value = Str::lower(Str::ascii($value));
        $value = preg_replace('/\s+/u', '', $value) ?? $value;

        return $value;
    }
}
