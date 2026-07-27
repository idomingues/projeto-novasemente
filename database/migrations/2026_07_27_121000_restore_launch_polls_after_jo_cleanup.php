<?php

use Database\Seeders\PollsLaunchSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Restaura «Jó» (2 letras) após limpeza que usava mínimo 3 por engano.
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
        //
    }
};
