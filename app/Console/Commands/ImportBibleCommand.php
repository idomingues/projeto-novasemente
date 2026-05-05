<?php

namespace App\Console\Commands;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ImportBibleCommand extends Command
{
    protected $signature = 'bible:import
                            {--path=assets/acf.json : Caminho do JSON (relativo ao projeto)}
                            {--truncate : Limpa tabelas antes de importar}';

    protected $description = 'Importa a Bíblia do JSON para a base de dados';

    public function handle(): int
    {
        if (! Schema::hasTable('bible_books') || ! Schema::hasTable('bible_verses')) {
            $this->error('Tabelas bible_books/bible_verses não existem. Rode as migrations primeiro.');

            return 1;
        }

        $path = (string) $this->option('path');
        $path = trim($path) !== '' ? trim($path) : 'assets/acf.json';
        $fullPath = base_path($path);

        if (! is_file($fullPath)) {
            $this->error("Arquivo não encontrado: {$fullPath}");

            return 1;
        }

        $raw = file_get_contents($fullPath);
        if ($raw === false) {
            $this->error("Não foi possível ler: {$fullPath}");

            return 1;
        }

        // Remove BOM (UTF-8) caso exista.
        $raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw) ?? $raw;

        /** @var array<int, array{abbrev:string,name:string,chapters:array<int, array<int, string>>}>|null $data */
        $data = json_decode($raw, true);
        if (! is_array($data) || count($data) !== 66) {
            $this->error('JSON inválido ou inesperado. Esperado: array com 66 livros (abbrev/name/chapters).');

            return 1;
        }

        $this->info('A importar… (pode demorar alguns segundos)');

        DB::transaction(function () use ($data) {
            if ((bool) $this->option('truncate')) {
                DB::table('bible_verses')->delete();
                DB::table('bible_books')->delete();
            }

            $existingByKey = BibleBook::query()->get()->keyBy('key');
            $usedKeys = [];
            foreach (BibleBook::query()->pluck('key')->all() as $k) {
                if (is_string($k) && $k !== '') {
                    $usedKeys[$k] = true;
                }
            }

            foreach (array_values($data) as $i => $bookRow) {
                $abbrev = trim((string) ($bookRow['abbrev'] ?? ''));
                $name = trim((string) ($bookRow['name'] ?? ''));
                $chapters = $bookRow['chapters'] ?? null;

                if ($abbrev === '' || $name === '' || ! is_array($chapters)) {
                    throw new \RuntimeException("Livro inválido no índice {$i}.");
                }

                $position = $i + 1;
                $testament = $position <= 39 ? 'old' : 'new';
                $chaptersCount = count($chapters);

                $key = Str::lower(Str::ascii($abbrev));
                if (trim($key) === '') {
                    $key = 'book-'.$position;
                }
                if (isset($usedKeys[$key])) {
                    $key = $key.'-'.$position;
                }
                $usedKeys[$key] = true;

                /** @var BibleBook $book */
                $book = $existingByKey->get($key) ?? new BibleBook();
                $book->fill([
                    'key' => $key,
                    'abbrev' => $abbrev,
                    'name' => $name,
                    'testament' => $testament,
                    'position' => $position,
                    'chapters_count' => $chaptersCount,
                ]);
                $book->save();

                // Reimport idempotente: remove versos do livro e recria.
                BibleVerse::query()->where('book_id', $book->id)->delete();

                $now = now();
                $buffer = [];
                $chunk = 1000;

                foreach (array_values($chapters) as $cIdx => $verses) {
                    if (! is_array($verses)) {
                        continue;
                    }
                    $chapter = $cIdx + 1;
                    foreach (array_values($verses) as $vIdx => $text) {
                        $t = trim((string) $text);
                        if ($t === '') {
                            continue;
                        }
                        $buffer[] = [
                            'book_id' => $book->id,
                            'chapter' => $chapter,
                            'verse' => $vIdx + 1,
                            'text' => $t,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];

                        if (count($buffer) >= $chunk) {
                            DB::table('bible_verses')->insert($buffer);
                            $buffer = [];
                        }
                    }
                }

                if ($buffer) {
                    DB::table('bible_verses')->insert($buffer);
                }
            }
        });

        $books = (int) BibleBook::query()->count();
        $verses = (int) BibleVerse::query()->count();
        $this->info("OK. Livros: {$books} | Versículos: {$verses}");

        return 0;
    }
}

