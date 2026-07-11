<?php

namespace App\Console\Commands;

use App\Services\RevistaAdventistaArchiveSyncService;
use Illuminate\Console\Command;

class SyncRevistaAdventistaArchiveCommand extends Command
{
    protected $signature = 'revista-adventista:sync-archive
                            {--year=* : Anos específicos (padrão: todos os anos disponíveis no acervo CPB)}
                            {--purge : Apaga todas as edições e arquivos locais antes de sincronizar}
                            {--cache-pdfs : Baixa e armazena localmente todos os PDFs (opcional; o app usa a URL da CPB)}
                            {--force-covers : Baixa capas localmente (opcional; o app usa a URL da CPB)}';

    protected $description = 'Importa metadados do acervo CPB (capa e PDF remotos em acervo.cpb.com.br/ra)';

    public function handle(RevistaAdventistaArchiveSyncService $syncService): int
    {
        if ((bool) $this->option('purge')) {
            $this->warn('Apagando acervo local da Revista Adventista…');
            $purged = $syncService->purge();
            $this->info(sprintf(
                'Base limpa: %d edições, %d capas e %d PDFs removidos.',
                $purged['deleted'],
                $purged['covers_deleted'],
                $purged['pdfs_deleted'],
            ));
        }

        $years = $this->option('year');
        if (! is_array($years) || $years === []) {
            $years = null;
        } else {
            $years = array_values(array_map('intval', $years));
        }

        $cachePdfs = (bool) $this->option('cache-pdfs');
        $forceCovers = (bool) $this->option('force-covers');

        $label = $years === null
            ? 'todos os anos disponíveis na CPB'
            : 'anos: '.implode(', ', $years);

        $this->info('Sincronizando acervo Revista Adventista ('.$label.')…');

        $result = $syncService->sync($years, cachePdfs: $cachePdfs, forceCovers: $forceCovers);

        if (! ($result['ok'] ?? false)) {
            $this->error($result['error'] ?? 'Falha na sincronização.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Concluído: %d criadas, %d atualizadas, %d ignoradas, %d removidas (sem capa/PDF), %d capas baixadas, %d PDFs baixados.',
            $result['created'],
            $result['updated'],
            $result['skipped'],
            $result['removed'] ?? 0,
            $result['covers_downloaded'],
            $result['pdfs_downloaded'],
        ));

        return self::SUCCESS;
    }
}
