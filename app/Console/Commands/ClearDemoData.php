<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

#[AsCommand(name: 'app:clear-demo-data', description: 'Limpa dados de exemplo (membros, voluntários e escalas) para começar do zero')]
class ClearDemoData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:clear-demo-data';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Limpa dados de exemplo (membros, voluntários e escalas) para começar do zero';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Limpando dados de exemplo...');

        Schema::disableForeignKeyConstraints();

        // Escalas (check-ins e atribuições)
        if (Schema::hasTable('schedule_checkin_dates')) {
            DB::table('schedule_checkin_dates')->truncate();
        }
        if (Schema::hasTable('schedule_assignments')) {
            DB::table('schedule_assignments')->truncate();
        }

        // Voluntários (pivot e tabela principal)
        if (Schema::hasTable('ministry_volunteer')) {
            DB::table('ministry_volunteer')->truncate();
        }
        if (Schema::hasTable('volunteers')) {
            DB::table('volunteers')->truncate();
        }

        // Membros (deixa apenas a estrutura, sem registros)
        if (Schema::hasTable('members')) {
            DB::table('members')->truncate();
        }

        Schema::enableForeignKeyConstraints();

        $this->info('Dados de exemplo removidos. Você pode cadastrar tudo novamente a partir do sistema.');

        return self::SUCCESS;
    }
}

