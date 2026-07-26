<?php

namespace App\Console\Commands;

use Database\Seeders\PollsLaunchSeeder;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'polls:seed-launch',
    description: 'Cria/atualiza as 3 enquetes de lançamento com base de votos limpa (produção)',
)]
class SeedPollsLaunchCommand extends Command
{
    protected $signature = 'polls:seed-launch
                            {--church=nova-semente : ID ou slug da igreja}
                            {--replace-all : Apaga TODAS as enquetes da igreja antes de criar as 3}';

    public function handle(): int
    {
        $seeder = new PollsLaunchSeeder;
        $seeder->setCommand($this);
        $seeder->run();

        return self::SUCCESS;
    }
}
