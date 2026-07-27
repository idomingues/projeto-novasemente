<?php

use Database\Seeders\PollsLaunchSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Atualiza enquetes de lançamento em produção (personagens bíblicos + Outros).
 * A migration 2026_07_26_070000 já rodou com a lista antiga; esta reaplica o seeder.
 *
 * Atenção: zera os votos das enquetes de lançamento (mesmo comportamento de polls:seed-launch).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('polls') || ! Schema::hasTable('poll_options')) {
            return;
        }

        if (! Schema::hasColumn('poll_options', 'is_write_in')) {
            return;
        }

        (new PollsLaunchSeeder)->run();
    }

    public function down(): void
    {
        // Mantém as enquetes — não reverter conteúdo editorial.
    }
};
