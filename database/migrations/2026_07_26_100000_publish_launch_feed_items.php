<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

/**
 * Publica no feed unificado (produção): NS Whats + enquete do milagre.
 * Idempotente — safe em re-run via updateOrCreate / flags.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('news') || ! Schema::hasTable('polls')) {
            return;
        }

        if (Schema::hasColumn('polls', 'publish_to_feed') === false) {
            return;
        }

        Artisan::call('app:publish-launch-feed-items');
    }

    public function down(): void
    {
        // Mantém conteúdo editorial — não remover no rollback.
    }
};
