<?php

namespace Tests\Unit;

use App\Services\SaturdayProgramPdfParser;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SaturdayProgramPdfParserTest extends TestCase
{
    #[Test]
    public function it_parses_the_sample_saturday_program_pdf(): void
    {
        $path = base_path('tests/fixtures/saturday-program-sample.pdf');
        $this->assertFileExists($path);

        $schedule = (new SaturdayProgramPdfParser)->parseFile($path);

        $this->assertSame(1, $schedule['version']);
        $this->assertNotNull($schedule['heading']);
        $this->assertStringContainsStringIgnoringCase('CULTO', (string) $schedule['heading']);
        $this->assertSame('5 September 2026', $schedule['date_label']);

        $roles = array_column($schedule['crew'], 'role');
        $this->assertContains('Produção', $roles);
        $this->assertContains('Diaconato', $roles);
        $this->assertContains('Câmeras', $roles);

        $items = $schedule['items'];
        $this->assertGreaterThan(20, count($items));

        $titles = array_map(
            static fn (array $row) => $row['kind'] === 'item' ? ($row['title'] ?? '') : ($row['title'] ?? ''),
            $items,
        );

        $this->assertTrue(
            collect($titles)->contains(fn (string $t) => str_contains(mb_strtoupper($t), 'TESTE DE SOM')),
        );
        $this->assertTrue(
            collect($titles)->contains(fn (string $t) => str_contains(mb_strtoupper($t), 'MENSAGEM')),
        );
        $this->assertTrue(
            collect($titles)->contains(fn (string $t) => str_contains(mb_strtoupper($t), 'CONVIVA')),
        );

        $timed = array_values(array_filter($items, fn (array $row) => ($row['kind'] ?? '') === 'item'));
        $this->assertSame('08:00', $timed[0]['start']);
        $this->assertNotEmpty($timed[0]['person'] ?? null);
    }

    #[Test]
    public function it_parses_glued_start_and_duration(): void
    {
        $text = <<<'TXT'
CULTO DE SÁBADO
5 September 2026
Produção: Equipe A
10:1440:00MENSAGEM
Person:Pr. Igor
CONVIVA
12:03:306:00LOUVOR 1: No Teu Altar	Person:Louvor | Banda
TXT;

        $schedule = (new SaturdayProgramPdfParser)->parseText($text);

        $items = $schedule['items'];
        $this->assertSame('item', $items[0]['kind']);
        $this->assertSame('10:14', $items[0]['start']);
        $this->assertSame('40:00', $items[0]['duration']);
        $this->assertStringContainsStringIgnoringCase('MENSAGEM', $items[0]['title']);

        $this->assertSame('section', $items[1]['kind']);
        $this->assertSame('CONVIVA', $items[1]['title']);

        $this->assertSame('12:03:30', $items[2]['start']);
        $this->assertSame('6:00', $items[2]['duration']);
    }

    #[Test]
    public function it_collapses_sidebar_phase_blocks_and_skips_totals(): void
    {
        $path = base_path('tests/fixtures/saturday-program-sample.pdf');
        $schedule = (new SaturdayProgramPdfParser)->parseFile($path);
        $items = $schedule['items'];

        $sectionTitles = array_column(
            array_values(array_filter($items, static fn (array $row) => ($row['kind'] ?? '') === 'section')),
            'title',
        );

        $this->assertNotContains('PRÉ ABERTURA - 1º CULTO', $sectionTitles);
        $this->assertNotContains('BOAS VINDAS - 1º CULTO', $sectionTitles);
        $this->assertNotContains('LOUVOR - 1º CULTO', $sectionTitles);
        $this->assertContains('CONVIVA', $sectionTitles);
        $this->assertTrue(
            collect($sectionTitles)->contains(
                fn (string $t) => str_contains(mb_strtoupper($t), 'INTERVALO') || $t === '2º CULTO',
            ),
        );

        $maxRun = 0;
        $run = 0;
        foreach ($items as $row) {
            if (($row['kind'] ?? '') === 'section') {
                $run++;
                $maxRun = max($maxRun, $run);
            } else {
                $run = 0;
            }
        }
        $this->assertLessThanOrEqual(3, $maxRun);

        $starts = array_column(
            array_filter($items, static fn (array $r) => ($r['kind'] ?? '') === 'item'),
            'start',
        );
        $this->assertNotContains('13:39:30', $starts);
    }
}
