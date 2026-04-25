<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

#[AsCommand(
    name: 'volunteers:purge',
    description: 'Remove todos os registos de voluntários (inclui pivot, pipeline, notas e checks).'
)]
class PurgeVolunteersCommand extends Command
{
    protected $signature = 'volunteers:purge {--force : Executa sem pedir confirmação}';

    public function handle(): int
    {
        if (! $this->option('force')) {
            $ok = $this->confirm('Isto APAGA TODOS os voluntários e dados relacionados. Continuar?', false);
            if (! $ok) {
                $this->info('Cancelado.');

                return self::SUCCESS;
            }
        }

        $this->info('Limpando base de voluntários...');

        Schema::disableForeignKeyConstraints();

        $tables = [
            'volunteer_clearance_checks',
            'volunteer_leader_notes',
            'volunteer_church_pipelines',
            'ministry_volunteer',
            'volunteers',
        ];

        foreach ($tables as $t) {
            if (Schema::hasTable($t)) {
                DB::table($t)->truncate();
                $this->line(" - truncado: {$t}");
            }
        }

        Schema::enableForeignKeyConstraints();

        $this->info('Base de voluntários limpa.');

        return self::SUCCESS;
    }
}

