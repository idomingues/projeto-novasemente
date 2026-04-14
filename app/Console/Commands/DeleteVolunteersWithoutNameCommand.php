<?php

namespace App\Console\Commands;

use App\Models\Volunteer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DeleteVolunteersWithoutNameCommand extends Command
{
    protected $signature = 'volunteers:delete-without-name
        {--force : Eliminar de facto (sem isto, apenas mostra quantos seriam removidos)}';

    protected $description = 'Remove registos de voluntários sem nome (null, vazio ou só espaços).';

    public function handle(): int
    {
        $query = Volunteer::query()->whereRaw("TRIM(COALESCE(name, '')) = ''");
        $count = (clone $query)->count();

        if ($count === 0) {
            $this->info('Nenhum voluntário sem nome encontrado.');

            return self::SUCCESS;
        }

        $ids = (clone $query)->orderBy('id')->pluck('id')->all();
        $idPreview = $ids;
        if (count($idPreview) > 40) {
            $idPreview = array_merge(array_slice($idPreview, 0, 40), ['…']);
        }
        $this->warn('Encontrados '.$count.' registo(s) sem nome (ids: '.implode(', ', $idPreview).').');

        if (! $this->option('force')) {
            $this->info('Nada foi alterado. Execute com --force para eliminar.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($query) {
            $deleted = $query->delete();
            $this->info("Eliminados {$deleted} registo(s).");
        });

        return self::SUCCESS;
    }
}
