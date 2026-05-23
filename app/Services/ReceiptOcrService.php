<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;

class ReceiptOcrService
{
    /**
     * @return array{suggested_amount: ?float, confidence: string, raw_text: string}
     */
    public function extractAmount(string $absoluteImagePath): array
    {
        $rawText = $this->extractText($absoluteImagePath);

        if ($rawText === '') {
            return [
                'suggested_amount' => null,
                'confidence' => 'none',
                'raw_text' => '',
            ];
        }

        $amount = $this->parseAmountFromText($rawText);

        return [
            'suggested_amount' => $amount,
            'confidence' => $amount !== null ? 'medium' : 'low',
            'raw_text' => $rawText,
        ];
    }

    private function extractText(string $absoluteImagePath): string
    {
        $driver = config('receipt-ocr.driver', 'local');

        if ($driver === 'local') {
            return $this->extractWithTesseract($absoluteImagePath);
        }

        return '';
    }

    private function extractWithTesseract(string $absoluteImagePath): string
    {
        $binary = config('receipt-ocr.tesseract_path', 'tesseract');
        $lang = config('receipt-ocr.tesseract_lang', 'por');

        try {
            $result = Process::timeout(30)->run([
                $binary,
                $absoluteImagePath,
                'stdout',
                '-l',
                $lang,
                '--psm',
                '6',
            ]);

            if ($result->successful()) {
                return trim($result->output());
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return '';
    }

    public function parseAmountFromText(string $text): ?float
    {
        $normalized = preg_replace('/\s+/u', ' ', $text) ?? $text;

        $candidates = [];

        if (preg_match_all('/R\$\s*([\d]{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/iu', $normalized, $matches)) {
            foreach ($matches[1] as $raw) {
                $candidates[] = $this->brlStringToFloat($raw);
            }
        }

        if (preg_match_all('/(?:valor|total|transfer[eê]ncia|pago|pagamento)\s*[:\-]?\s*R?\$?\s*([\d]{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/iu', $normalized, $labelMatches)) {
            foreach ($labelMatches[1] as $raw) {
                $candidates[] = $this->brlStringToFloat($raw);
            }
        }

        if (preg_match_all('/\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/u', $normalized, $genericMatches)) {
            foreach ($genericMatches[1] as $raw) {
                $candidates[] = $this->brlStringToFloat($raw);
            }
        }

        $candidates = array_values(array_filter(
            $candidates,
            fn (?float $v) => $v !== null && $v > 0 && $v <= 999_999.99
        ));

        if ($candidates === []) {
            return null;
        }

        return max($candidates);
    }

    private function brlStringToFloat(string $raw): ?float
    {
        $clean = trim($raw);
        if ($clean === '') {
            return null;
        }

        $clean = str_replace('.', '', $clean);
        $clean = str_replace(',', '.', $clean);

        if (! is_numeric($clean)) {
            return null;
        }

        return round((float) $clean, 2);
    }
}
