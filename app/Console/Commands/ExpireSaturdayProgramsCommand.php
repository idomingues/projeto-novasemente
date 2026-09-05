<?php

namespace App\Console\Commands;

use App\Services\SaturdayProgramService;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'app:expire-saturday-programs',
    description: 'Expira programações do sábado após as 15:00 e remove o PDF do storage',
)]
class ExpireSaturdayProgramsCommand extends Command
{
    protected $signature = 'app:expire-saturday-programs';

    public function handle(SaturdayProgramService $service): int
    {
        $stats = $service->expirePastPrograms();

        $this->info("Expiradas: {$stats['expired']} · Arquivos removidos: {$stats['files_deleted']}");

        return self::SUCCESS;
    }
}
