<?php

namespace App\Services;

use App\Models\RevistaAdventistaEdition;
use Illuminate\Support\Facades\Http;

class RevistaAdventistaArchiveCatalogService
{
    public const API_BASE = 'https://acervopyapi.cpb.com.br/api/v1/acervo';

    public const STORAGE_BASE = 'https://imagens.cpb.com.br/acervos/ra/';

    public const PERIODICO_ID = 1;

    /**
     * @return array{ok: bool, years?: list<int>, error?: string}
     */
    public function fetchAvailableYears(): array
    {
        try {
            $response = Http::timeout(45)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
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
        try {
            $response = Http::timeout(45)
                ->withHeaders(['User-Agent' => 'NovaSemente/1.0 (revista-adventista archive)'])
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
        $label = RevistaAdventistaEdition::monthLabels()[$month] ?? 'Mês '.$month;

        return $label.' de '.$year;
    }

    public function storageFilename(int $year, int $month, string $extension): string
    {
        return sprintf('%d_M%02d.%s', $year, $month, ltrim($extension, '.'));
    }
}
