<?php

namespace App\Support;

/**
 * Valores padrão da história "Caixa Fixo da Igreja" (transparência financeira).
 * Espelha resources/js/data/caixaFixoIgrejaStory.ts para o primeiro uso / fallback.
 */
final class CaixaFixoIgrejaStoryDefaults
{
    /**
     * @return array{
     *     monthly_total: float,
     *     cost_items: list<array{label: string, percent: float, amount: float, tone: string, compact?: bool}>,
     *     annual_year: int,
     *     annual_lines: list<array{label: string, amount: float, tone: string, emphasize?: bool, flow?: string}>
     * }
     */
    public static function financial(): array
    {
        return [
            'monthly_total' => 177_948.95,
            'cost_items' => [
                ['label' => 'Parcela da Construção (AP)', 'percent' => 28.1, 'amount' => 50_000.0, 'tone' => 'sky'],
                ['label' => 'Músicos, Som e Louvor', 'percent' => 19.02, 'amount' => 33_851.19, 'tone' => 'emerald'],
                ['label' => 'Segurança', 'percent' => 16.18, 'amount' => 28_785.4, 'tone' => 'amber'],
                ['label' => 'Pré e Pós-Produção (TV, Vídeo e Programa)', 'percent' => 15.17, 'amount' => 26_996.97, 'tone' => 'violet'],
                ['label' => 'Equipe de Limpeza', 'percent' => 5.67, 'amount' => 10_094.29, 'tone' => 'orange'],
                ['label' => 'Gestão Patrimonial', 'percent' => 3.44, 'amount' => 6_120.0, 'tone' => 'stone'],
                ['label' => 'Material de Higiene', 'percent' => 3.4, 'amount' => 6_058.45, 'tone' => 'zinc'],
                ['label' => 'Ar-Condicionado', 'percent' => 2.63, 'amount' => 4_684.0, 'tone' => 'cyan'],
                ['label' => 'Energia Elétrica', 'percent' => 2.3, 'amount' => 4_095.78, 'tone' => 'yellow'],
                ['label' => 'Conservação Predial', 'percent' => 2.27, 'amount' => 4_038.48, 'tone' => 'lime'],
                ['label' => 'Água e Esgoto', 'percent' => 0.85, 'amount' => 1_519.01, 'tone' => 'blue', 'compact' => true],
                ['label' => 'Material de Consumo', 'percent' => 0.74, 'amount' => 1_320.38, 'tone' => 'rose', 'compact' => true],
                ['label' => 'Internet', 'percent' => 0.19, 'amount' => 336.94, 'tone' => 'indigo', 'compact' => true],
                ['label' => 'Gás', 'percent' => 0.03, 'amount' => 48.06, 'tone' => 'red', 'compact' => true],
            ],
            'annual_year' => 2026,
            'annual_lines' => [
                ['label' => 'Saldo inicial', 'amount' => 407_381.06, 'tone' => 'emerald'],
                ['label' => 'Ofertas 2026', 'amount' => 977_249.48, 'tone' => 'sky', 'flow' => 'in'],
                ['label' => 'Despesas 2026', 'amount' => -856_814.83, 'tone' => 'amber', 'flow' => 'out'],
                ['label' => 'Repassar AP Construção', 'amount' => -468_816.9, 'tone' => 'orange', 'flow' => 'out'],
                ['label' => 'Saldo atual', 'amount' => 58_998.81, 'tone' => 'brand', 'emphasize' => true],
            ],
        ];
    }
}
