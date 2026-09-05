<?php

namespace App\Console\Commands;

use App\Models\SaturdayProgram;
use App\Services\SaturdayProgramService;
use Illuminate\Console\Command;

class ReparseSaturdayProgramsCommand extends Command
{
    protected $signature = 'app:reparse-saturday-programs {--only-missing : Só registros sem lista ok}';

    protected $description = 'Recaptura a programação formatada a partir dos PDFs do sábado';

    public function handle(SaturdayProgramService $service): int
    {
        $query = SaturdayProgram::query()
            ->where('is_active', true)
            ->whereNotNull('pdf_path')
            ->where('pdf_path', '!=', '')
            ->orderBy('id');

        if ($this->option('only-missing')) {
            $query->where(function ($q) {
                $q->whereNull('parse_status')
                    ->orWhere('parse_status', '!=', SaturdayProgram::PARSE_OK)
                    ->orWhereNull('schedule');
            });
        }

        $ok = 0;
        $failed = 0;

        foreach ($query->cursor() as $program) {
            /** @var SaturdayProgram $program */
            $before = $program->parse_status;
            $updated = $service->reparseFromDisk($program);
            if ($updated->parse_status === SaturdayProgram::PARSE_OK) {
                $ok++;
                $this->line("OK #{$updated->id} (antes: {$before})");
            } else {
                $failed++;
                $this->warn("Falha #{$updated->id}: {$updated->parse_error}");
            }
        }

        $this->info("Concluído. Ok: {$ok}. Falha: {$failed}.");

        return self::SUCCESS;
    }
}
