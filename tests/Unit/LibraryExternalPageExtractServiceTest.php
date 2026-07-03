<?php

namespace Tests\Unit;

use App\Services\BibleReferenceService;
use App\Services\LibraryExternalPageExtractService;
use ReflectionMethod;
use Tests\TestCase;

class LibraryExternalPageExtractServiceTest extends TestCase
{
    public function test_normalizes_editorial_omissions_and_broken_words_in_reader_html(): void
    {
        $service = new LibraryExternalPageExtractService($this->createStub(BibleReferenceService::class));
        $method = new ReflectionMethod($service, 'normalizeReaderTextArtifacts');
        $method->setAccessible(true);

        $html = '<p>Paulo decidiu deixá-lo. [...]</p><p>O Senhor disse: “Não tenha medo! Pelo contrário, fale [...], pois Eu tenho muito povo nesta cidade”.</p><p>Seu cora-ção e sua pos-tura mostram que sabe-mos como Deus pre-parou tudo.</p>';

        $normalized = (string) $method->invoke($service, $html);

        $this->assertStringNotContainsString('[...]', $normalized);
        $this->assertStringContainsString('Paulo decidiu deixá-lo.', $normalized);
        $this->assertStringContainsString('fale, pois Eu tenho muito povo', $normalized);
        $this->assertStringContainsString('coração', $normalized);
        $this->assertStringContainsString('postura', $normalized);
        $this->assertStringContainsString('sabemos', $normalized);
        $this->assertStringContainsString('preparou', $normalized);
        $this->assertStringContainsString('<p>', $normalized);
    }
}
