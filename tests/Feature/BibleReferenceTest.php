<?php

namespace Tests\Feature;

use App\Models\BibleBook;
use App\Models\BibleVerse;
use App\Services\BibleReferenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BibleReferenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $books = [
            ['key' => 'atos', 'abbrev' => 'atos', 'name' => 'Atos', 'position' => 44, 'chapters' => 28],
            ['key' => 'ap', 'abbrev' => 'ap', 'name' => 'Apocalipse', 'position' => 66, 'chapters' => 22],
            ['key' => 'jo', 'abbrev' => 'jo', 'name' => 'Jó', 'position' => 18, 'chapters' => 42],
            ['key' => 'jo-43', 'abbrev' => 'jo', 'name' => 'João', 'position' => 43, 'chapters' => 21],
            ['key' => 'is', 'abbrev' => 'is', 'name' => 'Isaías', 'position' => 23, 'chapters' => 66],
            ['key' => 'mt', 'abbrev' => 'mt', 'name' => 'Mateus', 'position' => 40, 'chapters' => 28],
            ['key' => 'cl', 'abbrev' => 'cl', 'name' => 'Colossenses', 'position' => 51, 'chapters' => 4],
            ['key' => '1pe', 'abbrev' => '1pe', 'name' => '1 Pedro', 'position' => 60, 'chapters' => 5],
            ['key' => 'tg', 'abbrev' => 'tg', 'name' => 'Tiago', 'position' => 59, 'chapters' => 5],
            ['key' => '1ts', 'abbrev' => '1ts', 'name' => '1 Tessalonicenses', 'position' => 52, 'chapters' => 5],
            ['key' => 'fp', 'abbrev' => 'fp', 'name' => 'Filipenses', 'position' => 50, 'chapters' => 4],
        ];

        foreach ($books as $row) {
            $book = BibleBook::query()->create([
                'key' => $row['key'],
                'abbrev' => $row['abbrev'],
                'name' => $row['name'],
                'testament' => $row['position'] <= 39 ? 'old' : 'new',
                'position' => $row['position'],
                'chapters_count' => $row['chapters'],
            ]);

            if ($row['key'] === 'atos') {
                foreach ([9, 10] as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 18,
                        'verse' => $verse,
                        'text' => "Texto de Atos 18:{$verse}.",
                    ]);
                }
            }

            if ($row['key'] === 'ap') {
                $apVerses = [
                    [5, 12],
                    [14, 4],
                    [7, 17],
                    [22, 4],
                    [21, 4],
                ];
                foreach ($apVerses as [$chapter, $verse]) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => $chapter,
                        'verse' => $verse,
                        'text' => "Texto de Ap {$chapter}:{$verse}.",
                    ]);
                }
                foreach (range(9, 27) as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 21,
                        'verse' => $verse,
                        'text' => "Texto de Ap 21:{$verse}.",
                    ]);
                }
            }

            if ($row['key'] === 'jo-43') {
                foreach (range(35, 37) as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 1,
                        'verse' => $verse,
                        'text' => "Texto de João 1:{$verse}.",
                    ]);
                }
                BibleVerse::query()->create([
                    'book_id' => $book->id,
                    'chapter' => 6,
                    'verse' => 44,
                    'text' => 'Texto de João 6:44.',
                ]);
            }

            if ($row['key'] === 'is') {
                BibleVerse::query()->create([
                    'book_id' => $book->id,
                    'chapter' => 25,
                    'verse' => 8,
                    'text' => 'Texto de Isaías 25:8.',
                ]);
                foreach (range(1, 3) as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 55,
                        'verse' => $verse,
                        'text' => "Texto de Isaías 55:{$verse}.",
                    ]);
                }
            }

            if ($row['key'] === 'mt') {
                foreach ([[22, 1], [25, 1], [25, 13]] as [$chapter, $verse]) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => $chapter,
                        'verse' => $verse,
                        'text' => "Texto de Mateus {$chapter}:{$verse}.",
                    ]);
                }
                foreach (range(28, 30) as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 11,
                        'verse' => $verse,
                        'text' => "Texto de Mateus 11:{$verse}.",
                    ]);
                }
            }

            if ($row['key'] === 'cl') {
                BibleVerse::query()->create([
                    'book_id' => $book->id,
                    'chapter' => 3,
                    'verse' => 2,
                    'text' => 'Texto de Colossenses 3:2.',
                ]);
            }

            if ($row['key'] === '1pe') {
                BibleVerse::query()->create([
                    'book_id' => $book->id,
                    'chapter' => 4,
                    'verse' => 7,
                    'text' => 'Texto de 1 Pedro 4:7.',
                ]);
            }

            if ($row['key'] === 'tg') {
                foreach ([13, 14] as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 4,
                        'verse' => $verse,
                        'text' => "Texto de Tiago 4:{$verse}.",
                    ]);
                }
            }

            if ($row['key'] === '1ts') {
                BibleVerse::query()->create([
                    'book_id' => $book->id,
                    'chapter' => 4,
                    'verse' => 17,
                    'text' => 'Texto de 1 Tessalonicenses 4:17.',
                ]);
            }

            if ($row['key'] === 'fp') {
                foreach ([10, 11] as $verse) {
                    BibleVerse::query()->create([
                        'book_id' => $book->id,
                        'chapter' => 2,
                        'verse' => $verse,
                        'text' => "Texto de Filipenses 2:{$verse}.",
                    ]);
                }
            }
        }
    }

    public function test_reference_endpoint_resolves_cpb_style_reference(): void
    {
        $this->getJson(route('mobile.bible.reference', ['ref' => 'At 18:9, 10']))
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('ref', 'Atos 18:9-10')
            ->assertJsonCount(2, 'verses');
    }

    public function test_reference_endpoint_resolves_cpb_suffix_reference(): void
    {
        $this->getJson(route('mobile.bible.reference', ['ref' => 'Is 25:8p']))
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('ref', 'Isaías 25:8');
    }

    public function test_reference_endpoint_returns_error_for_unknown_reference(): void
    {
        $this->getJson(route('mobile.bible.reference', ['ref' => 'Licao 99:1']))
            ->assertStatus(422)
            ->assertJsonPath('ok', false);
    }

    public function test_linkify_wraps_parenthesized_references_in_buttons(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Texto do verso (At 18:9, 10)</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertStringContainsString('data-bible-ref="At 18:9, 10"', $linked);
        $this->assertStringContainsString('class="bible-ref-link"', $linked);
        $this->assertStringContainsString('<button', $linked);
        $this->assertSame(1, substr_count($linked, 'data-bible-ref='));
    }

    public function test_linkify_handles_inline_tags_without_duplicating_reference(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Mas <em>(Ap 14:4)</em> desejarmos palavras (Ap 22:4) no fim.</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertStringContainsString('data-bible-ref="Ap 14:4"', $linked);
        $this->assertStringContainsString('data-bible-ref="Ap 22:4"', $linked);
        $this->assertStringNotContainsString('<em>', $linked);
        $this->assertStringNotContainsString('(Ap 14:4)(Ap 14:4)', $linked);
        $this->assertSame(2, substr_count($linked, 'data-bible-ref='));
        $this->assertStringContainsString('Mas ', $linked);
        $this->assertStringContainsString(' desejarmos palavras ', $linked);
    }

    public function test_linkify_links_repeated_parenthesized_references(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Glória (Ap 5:12). Louvor (Ap 5:12) de novo.</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame(2, substr_count($linked, 'data-bible-ref="Ap 5:12"'));
        $this->assertStringNotContainsString('(Ap 5:12).(Ap 5:12)', $linked);
    }

    public function test_linkify_links_standalone_question_references(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>4. Que bênçãos receberemos? Is 25:8p Ap 7:17</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertStringContainsString('data-bible-ref="Is 25:8p"', $linked);
        $this->assertStringContainsString('data-bible-ref="Ap 7:17"', $linked);
    }

    public function test_linkify_links_both_colossians_references_without_duplicating_plain_text(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Pensem nas coisas lá do alto (Cl 3:2).(Cl 3:2)</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame(2, substr_count($linked, 'data-bible-ref="Cl 3:2"'));
        $this->assertStringNotContainsString('(Cl 3:2).(Cl 3:2)', $linked);
    }

    public function test_linkify_links_veja_matthew_references_inside_parentheses(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Deus prepara o evento (veja Mt 22:1-14; 25:1-13).</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertStringContainsString('data-bible-ref="Mt 22:1-14"', $linked);
        $this->assertStringContainsString('data-bible-ref="Mt 25:1-13"', $linked);
        $this->assertStringContainsString('veja ', $linked);
    }

    public function test_linkify_preserves_text_with_accents_and_parenthesized_apocalypse(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Mas, não desejarmos (Ap 14:4) seguir o Cordeiro';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertSame(1, substr_count($linked, 'data-bible-ref='));
        $this->assertStringContainsString('data-bible-ref="Ap 14:4"', $linked);
        $this->assertStringContainsString('>(Ap 14:4)<', $linked);
        $this->assertStringContainsString('não desejarmos', strip_tags($linked));
        $this->assertStringNotContainsString('p 14:4)]', strip_tags($linked));
    }

    public function test_linkify_preserves_accents_with_ap_seven_seventeen(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Como (Ap 7:17), Suas ovelhas não errarão';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertSame(1, substr_count($linked, 'data-bible-ref='));
        $this->assertStringContainsString('>(Ap 7:17)<', $linked);
        $this->assertStringContainsString('não errarão', strip_tags($linked));
    }

    public function test_linkify_preserves_palavras_with_ap_twenty_two_four(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Em outras palavras (Ap 22:4), teremos o Seu nome';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertSame(1, substr_count($linked, 'data-bible-ref='));
        $this->assertStringContainsString('palavras', strip_tags($linked));
        $this->assertStringContainsString('>(Ap 22:4)<', $linked);
        $this->assertDoesNotMatchRegularExpression('/palavras.*avras|palav.*\(Ap 22:4\).*avras/u', strip_tags($linked));
    }

    public function test_linkify_preserves_text_with_em_tags_and_accents(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $html = '<p>Mas, <em>não</em> desejarmos (Ap 14:4) seguir</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame('Mas, não desejarmos (Ap 14:4) seguir', strip_tags($linked));
        $this->assertSame(1, substr_count($linked, 'data-bible-ref='));
        $this->assertStringNotContainsString('<em>', $linked);
        $this->assertStringContainsString('não desejarmos', $linked);
    }

    public function test_linkify_links_implicit_book_after_semicolon_chain(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = '4. Que outras bênçãos receberemos na eternidade? Is 25:8; Ap 7:17; 21:4';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertSame(3, substr_count($linked, 'data-bible-ref='));
        $this->assertStringContainsString('data-bible-ref="Ap 21:4"', $linked);
    }

    public function test_linkify_links_full_book_name_with_verse_range(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Por que é difícil imaginar Apocalipse 21:9-27?';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="Apocalipse 21:9-27"', $linked);
    }

    public function test_linkify_links_glued_numbered_abbreviation_with_version_suffix_in_parens(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Texto "(1Pe 4:7, NVI)" no fim.';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="1Pe 4:7"', $linked);
    }

    public function test_linkify_links_full_numbered_book_name(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Leia 1 Tessalonicenses 4:17. O que Paulo escreveu.';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="1 Tessalonicenses 4:17"', $linked);
    }

    public function test_linkify_links_full_book_name_with_e_between_verses(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'O que Paulo escreveu em Filipenses 2:10 e 11 repercutirá.';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="Filipenses 2:10 e 11"', $linked);
    }

    public function test_linkify_links_jo_six_forty_four_in_semicolon_chain(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Sl 80:1; Ap 7:17; Is 25:8; Jo 6:44';
        $html = '<div>'.$original.'</div>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="Jo 6:44"', $linked);
    }

    public function test_linkify_plain_text_question_with_apocalypse_range(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $linked = $svc->linkifyPlainText('Por que é difícil imaginar Apocalipse 21:9-27?');

        $this->assertStringContainsString('data-bible-ref="Apocalipse 21:9-27"', $linked);
        $this->assertSame(
            'Por que é difícil imaginar Apocalipse 21:9-27?',
            strip_tags($linked)
        );
    }

    public function test_linkify_jo_one_thirty_five_thirty_seven_when_job_also_has_abbrev_jo(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'João Batista apresentou Jesus (Jo 1:35-37) e nós seguimos o Cordeiro (Ap 14:4).';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="Jo 1:35-37"', $linked);
        $this->assertStringContainsString('>(Jo 1:35-37)<', $linked);
        $this->assertStringContainsString('data-bible-ref="Ap 14:4"', $linked);
    }

    public function test_linkify_jo_six_forty_four_in_semicolon_chain_with_mt_and_is(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $original = 'Leia os textos Mt 11:28-30; Is 55:1-3; Jo 6:44';
        $html = '<p>'.$original.'</p>';
        $linked = $svc->linkifyLessonHtml($html);

        $this->assertSame($original, strip_tags($linked));
        $this->assertStringContainsString('data-bible-ref="Jo 6:44"', $linked);
        $this->assertSame(3, substr_count($linked, 'data-bible-ref='));
    }

    public function test_resolve_jo_prefers_john_over_job_when_both_share_abbrev(): void
    {
        /** @var BibleReferenceService $svc */
        $svc = app(BibleReferenceService::class);

        $resolved = $svc->resolveReferenceString('Jo 6:44');

        $this->assertNotNull($resolved);
        $this->assertSame('João', $resolved['book']);
        $this->assertSame(6, $resolved['chapter']);
    }
}
