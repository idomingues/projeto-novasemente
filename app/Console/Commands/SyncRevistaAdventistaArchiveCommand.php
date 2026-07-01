<?php

namespace App\Console\Commands;

use App\Services\RevistaAdventistaArchiveSyncService;
use Illuminate\Console\Command;

class SyncRevistaAdventistaArchiveCommand extends Command
{
    protected $signature = 'revista-adventista:sync-archive
                            {--year=* : Anos específicos (padrão: todos os anos disponíveis no acervo CPB)}
                            {--cache-pdfs : Baixa e armazena localmente todos os PDFs}
                            {--force-covers : Rebaixa todas as capas mesmo que já existam localmente}';

    protected $description = 'Importa o acervo histórico da Revista Adventista (CPB) com capas e PDFs';

    public function handle(RevistaAdventistaArchiveSyncService $syncService): int
    {
        $years = $this->option('year');
        if (! is_array($years) || $years === []) {
            $years = null;
        } else {
            $years = array_values(array_map('intval', $years));
        }

        $cachePdfs = (bool) $this->option('cache-pdfs');
        $forceCovers = (bool) $this->option('force-covers');

        $label = $years === null
            ? 'todos os anos disponíveis'
            : 'anos: '.implode(', ', $years);

        $this->info('Sincronizando acervo Revista Adventista ('.$label.')…');

        $result = $syncService->sync($years, cachePdfs: $cachePdfs, forceCovers: $forceCovers);

        if (! ($result['ok'] ?? false)) {
            $this->error($result['error'] ?? 'Falha na sincronização.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Concluído: %d criadas, %d atualizadas, %d ignoradas, %d capas baixadas, %d PDFs baixados.',
            $result['created'],
            $result['updated'],
            $result['skipped'],
            $result['covers_downloaded'],
            $result['pdfs_downloaded'],
        ));

        return self::SUCCESS;
    }
}
