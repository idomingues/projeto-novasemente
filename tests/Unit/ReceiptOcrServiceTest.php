<?php

namespace Tests\Unit;

use App\Services\ReceiptOcrService;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReceiptOcrServiceTest extends TestCase
{
    #[DataProvider('amountTextProvider')]
    public function test_parse_amount_from_text(string $text, ?float $expected): void
    {
        $service = new ReceiptOcrService;

        $this->assertSame($expected, $service->parseAmountFromText($text));
    }

    public static function amountTextProvider(): array
    {
        return [
            ['Comprovante PIX Valor R$ 150,00', 150.0],
            ['Total: R$ 1.250,75 transferência', 1250.75],
            ['Pagamento 50,20', 50.2],
            ['Sem valor monetário aqui', null],
        ];
    }
}
