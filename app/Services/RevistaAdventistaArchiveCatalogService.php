<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;

class RevistaAdventistaArchiveCatalogService implements RevistaAdventistaArchiveProvider
{
    public const SOURCE = RevistaAdventistaEdition::SOURCE_CPB;

    public const API_BASE = 'https://acervopyapi.cpb.com.br/api/v1/acervo';

    public const STORAGE_BASE = 'https://imagens.cpb.com.br/acervos/ra/';

    public const PERIODICO_ID = 1;

    public function sourceKey(): string
    {
        return self::SOURCE;
    }

    /**
     * @return array{ok: bool, years?: list<int>, error?: string}
     */
    public function fetchAvailableYears(): array
    {
        try {
            $response = $this->httpClient(45)
                ->get(self::API_BASE.'/periodico/'.self::PERIODICO_ID, [
                    'bringAvailableYears' => 'true',
                ]);

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível acessar o acervo CPB (HTTP '.$response->status().').'];
            }

            $payload = $response->json();
            if (! is_array($payload)) {
                return ['ok' => false, 'error' => 'Resposta inválida do acervo CPB.'];
            }

            $years = array_values(array_unique(array_map('intval', (array) ($payload['anos_disponiveis'] ?? []))));
            sort($years);

            return ['ok' => true, 'years' => $years];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar anos do acervo: '.$e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, editions?: list<array<string, mixed>>, error?: string}
     */
    public function fetchEditionsForYear(int $year): array
    {
        $fetched = $this->fetchRawEditionsForYear($year);
        if (! ($fetched['ok'] ?? false)) {
            return $fetched;
        }

        $editions = [];

        foreach ($fetched['editions'] ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }

            $normalized = $this->normalizeEdition($item);
            if ($normalized !== null) {
                $editions[] = $normalized;
            }
        }

        return ['ok' => true, 'editions' => $editions];
    }

    /**
     * @return array{ok: bool, editions?: list<array<string, mixed>>, error?: string}
     */
    public function fetchRawEditionsForYear(int $year): array
    {
        try {
            $response = $this->httpClient(45)
                ->get(self::API_BASE.'/edicao', [
                    'id_periodico' => self::PERIODICO_ID,
                    'year' => $year,
                ]);

            if (! $response->successful()) {
                return ['ok' => false, 'error' => 'Não foi possível buscar edições de '.$year.' (HTTP '.$response->status().').'];
            }

            $editions = $response->json();
            if (! is_array($editions)) {
                return ['ok' => false, 'error' => 'Resposta inválida ao buscar edições de '.$year.'.'];
            }

            return ['ok' => true, 'editions' => $editions];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Erro ao buscar edições de '.$year.': '.$e->getMessage()];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>|null
     */
    public function normalizeEdition(array $item): ?array
    {
        $cpbId = (int) ($item['id_edicao'] ?? 0);
        $year = (int) ($item['ano'] ?? 0);
        $monthCode = trim((string) ($item['mes'] ?? ''));
        $month = $this->parseMonth($monthCode);

        if ($cpbId <= 0 || $year <= 0 || $month === null) {
            return null;
        }

        if (($item['ativo'] ?? true) === false) {
            return null;
        }

        $coverFile = trim((string) ($item['capa'] ?? ''));
        $pdfFile = trim((string) ($item['arquivo'] ?? ''));

        return [
            'source' => self::SOURCE,
            'source_edition_id' => (string) $cpbId,
            'cpb_edition_id' => $cpbId,
            'year' => $year,
            'month_code' => strtoupper($monthCode),
            'month' => $month,
            'title' => $this->editionTitle($year, $month),
            'source_cover_url' => $coverFile !== '' ? $this->buildCoverUrl($coverFile) : null,
            'source_pdf_url' => $pdfFile !== '' ? $this->buildPdfUrl($pdfFile) : null,
            'synced_at' => now(),
        ];
    }

    public function buildCoverUrl(string $filename): string
    {
        return self::STORAGE_BASE.ltrim($filename, '/');
    }

    public function buildPdfUrl(string $filename): string
    {
        return self::STORAGE_BASE.ltrim($filename, '/');
    }

    public function parseMonth(string $monthCode): ?int
    {
        if (! preg_match('/^M(\d{2})$/', strtoupper(trim($monthCode)), $matches)) {
            return null;
        }

        $month = (int) $matches[1];

        return ($month >= 1 && $month <= 12) ? $month : null;
    }

    public function editionTitle(int $year, int $month): string
    {
        return RevistaAdventistaEdition::buildTitle($year, $month);
    }

    public function storageFilename(int $year, int $month, string $extension): string
    {
        return RevistaAdventistaEdition::storageFilename($year, $month, $extension);
    }

    private function httpClient(int $timeoutSeconds)
    {
        return Http::timeout($timeoutSeconds)
            ->retry(3, 750, function ($exception, $request) {
                if ($exception instanceof \Illuminate\Http\Client\RequestException) {
                    $status = $exception->response?->status();

                    return in_array($status, [408, 425, 429, 500, 502, 503, 504], true);
                }

                return true;
            }, throw: false)
            ->withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; NovaSemente/1.0; +https://novasemente.app; revista-adventista archive)',
                'Accept' => 'application/json',
            ]);
    }
}
