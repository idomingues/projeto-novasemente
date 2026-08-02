<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('donation_campaigns', 'show_construcao_story')) {
            return;
        }

        $campaigns = DB::table('donation_campaigns')
            ->where(function ($q) {
                $q->where('title', 'like', '%Construção da Igreja%')
                    ->orWhere('title', 'like', '%Construcao da Igreja%');
            })
            ->where('show_construcao_story', false)
            ->get(['id', 'title', 'description', 'raised_amount']);

        foreach ($campaigns as $campaign) {
            $raw = str_replace(["\r\n", "\r"], "\n", (string) ($campaign->description ?? ''));
            $blocks = preg_split('/\n\s*\n/', trim($raw)) ?: [];
            $blocks = array_values(array_filter(array_map('trim', $blocks)));

            $title = 'Nossa História: Um Milagre Construído pela Fé';
            if (isset($blocks[0]) && str_contains($blocks[0], 'Nossa História')) {
                $title = $blocks[0];
                array_shift($blocks);
            }

            $paragraphs = [];
            foreach ($blocks as $block) {
                if (str_contains($block, 'a igreja arrecadou')) {
                    continue;
                }
                if (preg_match('/^R\$\s*[\d\.]+,\d{2}$/u', $block)) {
                    continue;
                }
                $paragraphs[] = $block;
            }

            if ($paragraphs === []) {
                $paragraphs = [
                    'Desde o lançamento oficial da campanha da construção, a Igreja Adventista da Nova Semente tem caminhado unida para erguer um espaço permanente de culto, evangelismo e acolhimento.',
                    'Cada contribuição fortalece a missão, reduz a dívida da obra e amplia o alcance do evangelho.',
                ];
            }

            $raised = (float) ($campaign->raised_amount ?: 5_866_737.86);
            if ($raised <= 0) {
                $raised = 5_866_737.86;
            }

            DB::table('donation_campaigns')->where('id', $campaign->id)->update([
                'show_construcao_story' => true,
                'show_caixa_fixo_story' => false,
                'construcao_story' => json_encode([
                    'launch_date' => '2023-11-01',
                    'as_of_date' => '2026-06-27',
                    'raised_amount' => round($raised, 2),
                    'eyebrow' => 'Campanha da construção',
                    'title' => $title,
                    'paragraphs' => $paragraphs,
                    'highlights' => [
                        'Hoje já não pagamos aluguel — temos uma igreja própria.',
                        'A campanha continua até a quitação completa da obra.',
                        'Cada oferta é gratidão, fé e investimento eterno.',
                    ],
                ], JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Não reverte conteúdo editorial automaticamente.
    }
};
