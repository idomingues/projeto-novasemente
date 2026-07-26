<?php

namespace App\Console\Commands;

use Database\Seeders\PollsLaunchSeeder;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

/** @deprecated Use polls:seed-launch */
#[AsCommand(
    name: 'polls:seed-demo',
    description: 'Alias de polls:seed-launch (enquetes de lançamento com votos zerados)',
)]
class SeedPollsDemoCommand extends Command
{
    protected $signature = 'polls:seed-demo
                            {--church=nova-semente : ID ou slug da igreja}
                            {--replace-all : Apaga TODAS as enquetes da igreja antes de criar as 3}';

    public function handle(): int
    {
        $this->warn('polls:seed-demo é alias de polls:seed-launch.');

        return $this->call('polls:seed-launch', [
            '--church' => $this->option('church'),
            '--replace-all' => (bool) $this->option('replace-all'),
        ]);
    }
}
