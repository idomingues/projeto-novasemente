<?php

namespace App\Services;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use App\Models\VersiculoCaixinha;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PromiseBoxVerseService
{
    public function bibleReady(): bool
    {
        return Schema::hasTable('bible_books') && Schema::hasTable('bible_verses');
    }

    public function tableReady(): bool
    {
        return Schema::hasTable('versiculos_caixinha');
    }

    /**
     * @return array<string, true>
     */
    public function existingReferenceKeys(): array
    {
        if (! $this->tableReady()) {
            return [];
        }

        $keys = [];
        VersiculoCaixinha::query()
            ->select(['livro', 'capitulo', 'versiculo_inicio', 'versiculo_fim'])
            ->cursor()
            ->each(function (VersiculoCaixinha $row) use (&$keys) {
                $keys[$row->referenceKey()] = true;
            });

        return $keys;
    }

    public function isDuplicate(string $livro, int $capitulo, int $versiculoInicio, int $versiculoFim, ?int $ignoreId = null): bool
    {
        if (! $this->tableReady()) {
            return false;
        }

        $query = VersiculoCaixinha::query()
            ->where('livro', $livro)
            ->where('capitulo', $capitulo)
            ->where('versiculo_inicio', $versiculoInicio)
            ->where('versiculo_fim', $versiculoFim);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        return $query->exists();
    }

    /**
     * @return array{text:string, ref:string}|null
     */
    public function resolveReference(string $livro, int $capitulo, int $versiculoInicio, int $versiculoFim): ?array
    {
        if (! $this->bibleReady()) {
            return null;
        }

        $book = BibleBook::query()->where('name', $livro)->first(['id', 'name']);
        if (! $book) {
            return null;
        }

        if ($versiculoFim < $versiculoInicio) {
            [$versiculoInicio, $versiculoFim] = [$versiculoFim, $versiculoInicio];
        }

        $verses = BibleVerse::query()
            ->where('book_id', (int) $book->id)
            ->where('chapter', $capitulo)
            ->whereBetween('verse', [$versiculoInicio, $versiculoFim])
            ->orderBy('verse')
            ->get(['verse', 'text']);

        if ($verses->isEmpty()) {
            return null;
        }

        $text = $verses->map(fn ($v) => trim((string) $v->text))->filter()->implode(' ');
        $ref = $versiculoInicio === $versiculoFim
            ? sprintf('%s %d:%d', $livro, $capitulo, $versiculoInicio)
            : sprintf('%s %d:%d-%d', $livro, $capitulo, $versiculoInicio, $versiculoFim);

        return ['text' => $text, 'ref' => $ref];
    }

    /**
     * @return list<string>
     */
    public function bookNames(): array
    {
        if (! $this->bibleReady()) {
            return [];
        }

        return BibleBook::query()->orderBy('position')->pluck('name')->all();
    }

    public function resolveBookName(string $input): ?string
    {
        $input = trim($input);
        if ($input === '') {
            return null;
        }

        foreach ($this->bookNameIndex() as $norm => $name) {
            if ($norm === $this->normBook($input)) {
                return $name;
            }
        }

        return null;
    }

    /**
     * @return array<string, string>
     */
    private function bookNameIndex(): array
    {
        static $cache = null;
        if (is_array($cache)) {
            return $cache;
        }

        $cache = [];
        if (! $this->bibleReady()) {
            return $cache;
        }

        foreach (BibleBook::query()->get(['name']) as $book) {
            $name = (string) $book->name;
            $cache[$this->normBook($name)] = $name;
            if ($this->normBook($name) === $this->normBook('Atos')) {
                $cache[$this->normBook('Atos dos Apóstolos')] = $name;
            }
        }

        return $cache;
    }

    private function normBook(string $value): string
    {
        $value = trim($value);
        $value = Str::lower(Str::ascii($value));
        $value = preg_replace('/\s+/u', ' ', $value) ?? $value;

        return $value;
    }
}
