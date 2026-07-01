<?php

namespace Tests\Unit;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use App\Services\BibleBookCatalog;
use App\Services\BibleReferenceParser;
use App\Services\BibleReferenceService;
use App\Services\PromiseBoxVerseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BibleReferenceParserTest extends TestCase
{
    use RefreshDatabase;

    private BibleReferenceParser $parser;

    protected function setUp(): void
    {
        parent::setUp();

        $book = BibleBook::query()->create([
            'key' => 'ap',
            'abbrev' => 'ap',
            'name' => 'Apocalipse',
            'testament' => 'new',
            'position' => 66,
            'chapters_count' => 22,
        ]);

        foreach ([[14, 4], [7, 17], [22, 4], [5, 12], [21, 4]] as [$chapter, $verse]) {
            BibleVerse::query()->create([
                'book_id' => $book->id,
                'chapter' => $chapter,
                'verse' => $verse,
                'text' => "Texto Ap {$chapter}:{$verse}.",
            ]);
        }

        $mt = BibleBook::query()->create([
            'key' => 'mt',
            'abbrev' => 'mt',
            'name' => 'Mateus',
            'testament' => 'new',
            'position' => 40,
            'chapters_count' => 28,
        ]);

        foreach ([[22, 1], [25, 1], [25, 13]] as [$chapter, $verse]) {
            BibleVerse::query()->create([
                'book_id' => $mt->id,
                'chapter' => $chapter,
                'verse' => $verse,
                'text' => "Texto Mt {$chapter}:{$verse}.",
            ]);
        }

        $is = BibleBook::query()->create([
            'key' => 'is',
            'abbrev' => 'is',
            'name' => 'Isaías',
            'testament' => 'old',
            'position' => 23,
            'chapters_count' => 66,
        ]);

        BibleVerse::query()->create([
            'book_id' => $is->id,
            'chapter' => 25,
            'verse' => 8,
            'text' => 'Texto de Isaías 25:8.',
        ]);

        $svc = app(BibleReferenceService::class);
        $catalog = new BibleBookCatalog(app(PromiseBoxVerseService::class));
        $this->parser = new BibleReferenceParser(
            fn (string $ref): bool => $svc->resolveReferenceString($ref) !== null,
            fn (string $ref): ?array => $svc->parseReferenceString($ref),
            $catalog,
        );
    }

    public function test_finds_parenthesized_reference_with_accents_before(): void
    {
        $text = 'Mas, não desejarmos (Ap 14:4) seguir';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(1, $matches);
        $this->assertSame('(Ap 14:4)', $matches[0]['display']);
        $this->assertSame('Ap 14:4', $matches[0]['inner']);
        $this->assertSame(mb_strpos($text, '(Ap 14:4)'), $matches[0]['offset']);
    }

    public function test_finds_standalone_reference_with_word_boundary(): void
    {
        $text = 'Que bênçãos? Ap 7:17 no fim';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(1, $matches);
        $this->assertSame('Ap 7:17', $matches[0]['display']);
    }

    public function test_finds_two_adjacent_parenthesized_references(): void
    {
        $text = '(Ap 5:12).(Ap 5:12)';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(2, $matches);
        $this->assertSame('(Ap 5:12)', $matches[0]['display']);
        $this->assertSame('(Ap 5:12)', $matches[1]['display']);
    }

    public function test_finds_semicolon_implicit_book_inside_parentheses(): void
    {
        $text = '(veja Mt 22:1-14; 25:1-13)';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(2, $matches);
        $this->assertSame('Mt 22:1-14', $matches[0]['inner']);
        $this->assertSame('Mt 25:1-13', $matches[1]['inner']);
    }

    public function test_does_not_match_inside_words(): void
    {
        $text = 'palavras sem referência';
        $matches = $this->parser->findAllInText($text);

        $this->assertSame([], $matches);
    }

    public function test_byte_offset_conversion_with_utf8_accents(): void
    {
        $text = 'não (Ap 22:4) palavras';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(1, $matches);
        $display = $matches[0]['display'];
        $this->assertSame('(Ap 22:4)', $display);
        $this->assertSame(mb_substr($text, $matches[0]['offset'], $matches[0]['length']), $display);
    }

    public function test_finds_implicit_book_in_plain_semicolon_chain(): void
    {
        $text = 'Is 25:8; Ap 7:17; 21:4';
        $matches = $this->parser->findAllInText($text);

        $this->assertCount(3, $matches);
        $this->assertSame('21:4', $matches[2]['display']);
        $this->assertSame('Ap 21:4', $matches[2]['inner']);
    }
}
