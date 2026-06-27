<?php

namespace App\Console\Commands;

use App\Services\RevistaAdventistaSyncService;
use Illuminate\Console\Command;

class SyncRevistaAdventistaCommand extends Command
{
    protected $signature = 'revista-adventista:sync {--year=* : Anos a importar (padrão: 2025 e 2026)}';

    protected $description = 'Importa ou atualiza artigos da Revista Adventista (2025–2026 por padrão)';

    public function handle(RevistaAdventistaSyncService $syncService): int
    {
        $years = $this->option('year');
        if (! is_array($years) || $years === []) {
            $years = [2025, 2026];
        }

        $years = array_values(array_map('intval', $years));

        $this->info('Sincronizando Revista Adventista (anos: '.implode(', ', $years).')…');

        $result = $syncService->sync($years);

        if (! ($result['ok'] ?? false)) {
            $this->error($result['error'] ?? 'Falha na sincronização.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Concluído: %d criados, %d atualizados, %d ignorados.',
            $result['created'],
            $result['updated'],
            $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
