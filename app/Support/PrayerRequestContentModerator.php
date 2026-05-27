<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class PrayerRequestContentModerator
{
    /** @var array<string, string> */
    private const CATEGORY_LABELS = [
        'hate' => 'discurso de ódio',
        'hate/threatening' => 'ameaça por ódio',
        'harassment' => 'assédio',
        'harassment/threatening' => 'ameaça ou assédio',
        'self-harm' => 'autoagressão',
        'self-harm/intent' => 'intenção de autoagressão',
        'self-harm/instructions' => 'instruções de autoagressão',
        'sexual' => 'conteúdo sexual',
        'sexual/minors' => 'conteúdo sexual envolvendo menores',
        'violence' => 'violência',
        'violence/graphic' => 'violência explícita',
    ];

    public function analyze(string $body): PrayerRequestModerationResult
    {
        $text = trim($body);
        if ($text === '') {
            return new PrayerRequestModerationResult(false, null, 'empty');
        }

        if (! config('prayer.request_moderation.enabled', true)) {
            return new PrayerRequestModerationResult(false, null, 'disabled');
        }

        $apiKey = config('prayer.request_moderation.openai_api_key');
        if (is_string($apiKey) && $apiKey !== '') {
            $openAi = $this->analyzeWithOpenAi($text, $apiKey);
            if ($openAi !== null) {
                return $openAi;
            }
        }

        return $this->analyzeWithHeuristics($text);
    }

    private function analyzeWithOpenAi(string $text, string $apiKey): ?PrayerRequestModerationResult
    {
        try {
            $response = Http::withToken($apiKey)
                ->timeout((int) config('prayer.request_moderation.timeout_seconds', 12))
                ->acceptJson()
                ->post('https://api.openai.com/v1/moderations', [
                    'model' => config('prayer.request_moderation.model', 'omni-moderation-latest'),
                    'input' => $text,
                ]);

            if (! $response->successful()) {
                Log::warning('Moderação OpenAI dos pedidos de oração falhou.', [
                    'status' => $response->status(),
                    'body' => Str::limit($response->body(), 500),
                ]);

                return null;
            }

            $result = $response->json('results.0');
            if (! is_array($result)) {
                return null;
            }

            $flagged = (bool) ($result['flagged'] ?? false);
            if (! $flagged) {
                return new PrayerRequestModerationResult(false, null, 'openai');
            }

            $categories = is_array($result['categories'] ?? null) ? $result['categories'] : [];
            $reason = $this->reasonFromCategories($categories);

            return new PrayerRequestModerationResult(true, $reason, 'openai');
        } catch (\Throwable $e) {
            Log::warning('Erro ao chamar moderação OpenAI dos pedidos de oração.', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $categories
     */
    private function reasonFromCategories(array $categories): string
    {
        $labels = [];
        foreach ($categories as $key => $value) {
            if ($value !== true) {
                continue;
            }
            $labels[] = self::CATEGORY_LABELS[$key] ?? str_replace('_', ' ', (string) $key);
        }

        if ($labels === []) {
            return 'Conteúdo sinalizado pela análise automática.';
        }

        return 'Sinalizado por: '.implode(', ', array_unique($labels)).'.';
    }

    private function analyzeWithHeuristics(string $text): PrayerRequestModerationResult
    {
        $normalized = mb_strtolower($text);
        $normalized = preg_replace('/\s+/u', ' ', $normalized) ?? $normalized;

        foreach (config('prayer.request_moderation.heuristic_terms', []) as $term) {
            $term = mb_strtolower(trim((string) $term));
            if ($term === '') {
                continue;
            }
            if (str_contains($normalized, $term)) {
                return new PrayerRequestModerationResult(
                    true,
                    'Termos inadequados detectados no pedido.',
                    'heuristic',
                );
            }
        }

        return new PrayerRequestModerationResult(false, null, 'heuristic');
    }
}

