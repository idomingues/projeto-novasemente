<?php

namespace Tests\Unit;

use App\Services\SunsetMeditationPdfService;
use Carbon\Carbon;
use Tests\TestCase;

class SunsetMeditationPdfServiceTest extends TestCase
{
    public function test_parse_segments_from_extracted_text(): void
    {
        $fixture = base_path('tests/fixtures/sunset-meditation-2026-sample.txt');
        if (! is_readable($fixture)) {
            $this->markTestSkipped('Fixture ausente.');
        }

        $svc = new SunsetMeditationPdfService;
        $segments = $svc->parseSegments((string) file_get_contents($fixture), 2026);

        $this->assertGreaterThanOrEqual(50, count($segments));
        $this->assertSame('2026-01-02', $segments[0]['date']);
        $this->assertSame('2 jan', $segments[0]['label']);
        $this->assertStringContainsString('O TRONO QUE IMPORTA', $segments[0]['html']);
        $this->assertStringContainsString('Apocalipse 4:2', $segments[0]['html']);
    }

    public function test_resolve_default_index_for_upcoming_friday(): void
    {
        $svc = new SunsetMeditationPdfService;
        $segments = [
            ['slug' => '2026-06-19', 'label' => '19 jun', 'date' => '2026-06-19', 'html' => '<p>A</p>'],
            ['slug' => '2026-06-26', 'label' => '26 jun', 'date' => '2026-06-26', 'html' => '<p>B</p>'],
            ['slug' => '2026-07-03', 'label' => '3 jul', 'date' => '2026-07-03', 'html' => '<p>C</p>'],
        ];

        $this->assertSame(1, $svc->resolveDefaultIndex($segments, Carbon::parse('2026-06-26', 'America/Sao_Paulo')));
        $this->assertSame(2, $svc->resolveDefaultIndex($segments, Carbon::parse('2026-06-27', 'America/Sao_Paulo')));
        $this->assertSame(1, $svc->resolveDefaultIndex($segments, Carbon::parse('2026-06-24', 'America/Sao_Paulo')));
    }
}
