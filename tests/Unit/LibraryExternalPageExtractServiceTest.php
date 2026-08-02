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

    public function test_resolves_ler_devocional_on_mulher_and_jovem_index_pages(): void
    {
        $service = new LibraryExternalPageExtractService($this->createStub(BibleReferenceService::class));
        $method = new ReflectionMethod($service, 'resolveCpbMeditationDailyUrlFromIndexIfApplicable');
        $method->setAccessible(true);

        $mulherHtml = '<html><body><a href="https://mais.cpb.com.br/?post_type=meditacao&amp;p=67322" class="mdl-button">Ler Devocional <i class="material-icons">chevron_right</i></a></body></html>';
        $jovemHtml = '<html><body><a href="https://mais.cpb.com.br/?post_type=meditacao&amp;p=67353"><button>LER DEVOCIONAL</button></a></body></html>';
        $hojeHtml = '<html><body>Aguarde um instante ou <a href="https://mais.cpb.com.br/?post_type=meditacao&amp;p=67353">clique aqui</a> para ser redirecionado</body></html>';

        $mulherUrl = $method->invoke($service, 'https://mais.cpb.com.br/meditacao-da-mulher-2/', $mulherHtml);
        $jovemUrl = $method->invoke($service, 'https://mais.cpb.com.br/meditacao-jovem/', $jovemHtml);
        $hojeUrl = $method->invoke($service, 'https://mais.cpb.com.br/meditacao-jovem-hoje/', $hojeHtml);

        $this->assertSame('https://mais.cpb.com.br/?post_type=meditacao&p=67322', $mulherUrl);
        $this->assertSame('https://mais.cpb.com.br/?post_type=meditacao&p=67353', $jovemUrl);
        $this->assertSame('https://mais.cpb.com.br/?post_type=meditacao&p=67353', $hojeUrl);
    }
}
