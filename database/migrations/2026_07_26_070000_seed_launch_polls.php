<?php

use Database\Seeders\PollsLaunchSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Garante as 3 enquetes de lançamento em produção no migrate (idempotente).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('polls') || ! Schema::hasTable('poll_options')) {
            return;
        }

        (new PollsLaunchSeeder)->run();
    }

    public function down(): void
    {
        // Mantém as enquetes — não apagar conteúdo editorial no rollback.
    }
};
