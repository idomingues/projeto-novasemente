<?php

namespace App\Console\Commands;

use App\Services\LibraryEgwSyncService;
use Illuminate\Console\Command;

class SyncEgwLibraryBooks extends Command
{
    protected $signature = 'library:sync-egw {--force-covers : Rebaixar todas as capas} {--cache-pdfs : Pré-cachear todos os PDFs no disco}';

    protected $description = 'Sincroniza o catálogo Ellen G. White a partir do Centro White';

    public function handle(LibraryEgwSyncService $syncService): int
    {
        $this->info('Sincronizando catálogo Ellen G. White...');

        $result = $syncService->sync(
            forceCovers: (bool) $this->option('force-covers'),
            cachePdfs: (bool) $this->option('cache-pdfs'),
        );

        if (! ($result['ok'] ?? false)) {
            $this->error($result['error'] ?? 'Falha na sincronização.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Concluído: %d criados, %d atualizados, %d removidos.',
            $result['created'],
            $result['updated'],
            $result['removed'],
        ));

        return self::SUCCESS;
    }
}
