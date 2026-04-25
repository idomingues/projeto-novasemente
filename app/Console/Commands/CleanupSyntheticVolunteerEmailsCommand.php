<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[AsCommand(
    name: 'volunteers:cleanup-synthetic-emails',
    description: 'Remove e-mails sintéticos (import.*@example.invalid) dos voluntários, definindo como NULL.'
)]
class CleanupSyntheticVolunteerEmailsCommand extends Command
{
    protected $signature = 'volunteers:cleanup-synthetic-emails {--dry-run : Mostra quantos seriam alterados}';

    public function handle(): int
    {
        $q = DB::table('volunteers')->where('email', 'like', 'import.%@example.invalid');

        $count = (int) $q->count();
        if ($this->option('dry-run')) {
            $this->info("Encontrados {$count} e-mails sintéticos.");

            return self::SUCCESS;
        }

        $updated = (int) $q->update(['email' => null]);
        $this->info("E-mails sintéticos limpos: {$updated}.");

        return self::SUCCESS;
    }
}

