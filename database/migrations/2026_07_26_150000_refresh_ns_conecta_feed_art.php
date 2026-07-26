<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

/**
 * Atualiza a arte do feed: NS Conecta (não NS Whats) e altura −25%.
 * Idempotente via app:publish-launch-feed-items.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('news')) {
            return;
        }

        Artisan::call('app:publish-launch-feed-items');
    }

    public function down(): void
    {
        // Mantém arte editorial.
    }
};
