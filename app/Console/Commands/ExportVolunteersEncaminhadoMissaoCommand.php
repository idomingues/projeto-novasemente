<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Support\VolunteerEncaminhadoMissaoExport;
use Illuminate\Console\Command;

class ExportVolunteersEncaminhadoMissaoCommand extends Command
{
    protected $signature = 'volunteers:export-encaminhado-missao
        {--church= : ID da igreja (padrão: igreja ativa no contexto ou primeira ativa)}
        {--output= : Caminho do arquivo .xlsx (padrão: storage/app/exports/...)}';

    protected $description = 'Gera Excel (Missão): vinculados + encaminhados ao departamento, como na Central de Gestão.';

    public function handle(): int
    {
        $churchId = $this->resolveChurchId();
        if ($churchId === null) {
            $this->error('Nenhuma igreja encontrada. Use --church=ID.');

            return self::FAILURE;
        }

        $churchName = Church::query()->whereKey($churchId)->value('name') ?? "ID {$churchId}";
        $missaoIds = VolunteerEncaminhadoMissaoExport::missaoMinistryIdsForChurch($churchId);
        if ($missaoIds === []) {
            $this->error('Nenhum departamento «Missão» encontrado nesta igreja.');

            return self::FAILURE;
        }

        $sets = VolunteerEncaminhadoMissaoExport::missaoVolunteerIdSets($churchId);

        $output = $this->option('output')
            ?: storage_path('app/exports/'.VolunteerEncaminhadoMissaoExport::downloadFilename());

        $count = VolunteerEncaminhadoMissaoExport::saveToPath($churchId, $output);

        $this->info("Igreja: {$churchName}");
        $this->info('Vinculados Missão: '.count($sets['vinculados']));
        $this->info('Encaminhados Missão: '.count($sets['encaminhados']));
        $this->info("Total na planilha: {$count}");
        $this->info("Arquivo: {$output}");

        return self::SUCCESS;
    }

    private function resolveChurchId(): ?int
    {
        if ($this->option('church')) {
            $id = (int) $this->option('church');

            return Church::query()->whereKey($id)->exists() ? $id : null;
        }

        $id = Church::query()->where('active', true)->orderBy('name')->value('id');

        return $id !== null ? (int) $id : null;
    }
}
