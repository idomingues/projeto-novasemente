<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PromiseBoxAiSuggestService
{
    public function __construct(
        private PromiseBoxVerseService $verseService,
        private PromiseBoxImportService $importService,
    ) {}

    public function isConfigured(): bool
    {
        $key = config('promise_box.ai.openai_api_key');

        return is_string($key) && trim($key) !== '';
    }

    /**
     * @return array{ok:bool, message?:string, items?:list<array<string, mixed>>, summary?:array<string, int>}
     */
    public function preview(string $prompt, int $limit = 15): array
    {
        if (! $this->isConfigured()) {
            return [
                'ok' => false,
                'message' => 'Configure a variável OPENAI_API_KEY no servidor para usar a busca com IA.',
            ];
        }

        if (! $this->verseService->bibleReady()) {
            return [
                'ok' => false,
                'message' => 'Importe a Bíblia no sistema antes de buscar versículos com IA.',
            ];
        }

        $prompt = trim($prompt);
        if ($prompt === '') {
            return [
                'ok' => false,
                'message' => 'Descreva o tipo de versículos que deseja encontrar.',
            ];
        }

        $limit = max(1, min((int) config('promise_box.ai.max_suggestions', 20), $limit));

        $rawSuggestions = $this->fetchSuggestionsFromOpenAi($prompt, $limit);
        if ($rawSuggestions === null) {
            return [
                'ok' => false,
                'message' => 'Não foi possível obter sugestões da IA agora. Tente novamente em instantes.',
            ];
        }

        $existing = $this->verseService->existingReferenceKeys();
        $seen = [];
        $items = [];
        $summary = [
            'suggested' => 0,
            'ready' => 0,
            'duplicate' => 0,
            'missing' => 0,
            'excluded' => 0,
        ];

        foreach ($rawSuggestions as $row) {
            $summary['suggested']++;
            $motivo = trim((string) ($row['motivo'] ?? ''));
            $item = $this->importService->buildPreviewItem(
                livro: (string) ($row['livro'] ?? ''),
                capitulo: (int) ($row['capitulo'] ?? 0),
                versiculoInicio: (int) ($row['versiculo_inicio'] ?? 0),
                versiculoFim: (int) ($row['versiculo_fim'] ?? ($row['versiculo_inicio'] ?? 0)),
                categoria: (string) ($row['categoria'] ?? 'Esperança'),
                nota: (int) ($row['nota'] ?? 8),
                peso: (int) ($row['peso'] ?? 5),
                existing: $existing,
                seen: $seen,
                motivo: $motivo,
            );

            if ($item === null) {
                continue;
            }

            $seen[$item['key']] = true;
            $items[] = $item;
            $summary[$item['status'] === 'ready' ? 'ready' : $item['status']]++;
        }

        return [
            'ok' => true,
            'items' => $items,
            'summary' => $summary,
        ];
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private function fetchSuggestionsFromOpenAi(string $prompt, int $limit): ?array
    {
        $apiKey = (string) config('promise_box.ai.openai_api_key');
        $books = $this->verseService->bookNames();
        $categories = config('promise_box.categories', []);

        $system = implode("\n", [
            'Você ajuda a curar versículos devocionais para um app cristão evangélico brasileiro (Caixa de Promessas).',
            'Responda SOMENTE com JSON válido no formato: {"versiculos":[{"livro":"...","capitulo":1,"versiculo_inicio":1,"versiculo_fim":1,"categoria":"...","nota":9,"peso":7,"motivo":"..."}]}',
            'Regras:',
            '- Use nomes exatos de livros desta lista: '.implode(', ', $books),
            '- Categorias permitidas: '.implode(', ', $categories),
            '- Não use a categoria Sábado.',
            '- Sugira versículos curtos, positivos, devocionais, que funcionem isoladamente.',
            '- Evite genealogias, violência, leis cerimoniais e textos muito contextuais.',
            '- nota e peso: inteiros de 1 a 10 (priorize 8+).',
            '- Não repita a mesma referência.',
            "- Máximo de {$limit} versículos.",
        ]);

        try {
            $response = Http::withToken($apiKey)
                ->timeout((int) config('promise_box.ai.timeout_seconds', 45))
                ->acceptJson()
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('promise_box.ai.model', 'gpt-4o-mini'),
                    'response_format' => ['type' => 'json_object'],
                    'temperature' => 0.4,
                    'messages' => [
                        ['role' => 'system', 'content' => $system],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('Busca IA da Caixa de Promessas falhou.', [
                    'status' => $response->status(),
                    'body' => Str::limit($response->body(), 500),
                ]);

                return null;
            }

            $content = $response->json('choices.0.message.content');
            if (! is_string($content) || trim($content) === '') {
                return null;
            }

            /** @var mixed $decoded */
            $decoded = json_decode($content, true);
            if (! is_array($decoded)) {
                return null;
            }

            $rows = $decoded['versiculos'] ?? $decoded['verses'] ?? $decoded['items'] ?? null;
            if (! is_array($rows)) {
                return null;
            }

            $out = [];
            foreach ($rows as $row) {
                if (is_array($row)) {
                    $out[] = $row;
                }
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('Erro ao chamar IA da Caixa de Promessas.', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
