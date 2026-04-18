<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->foreignId('solicitations_handler_volunteer_id')
                ->nullable()
                ->after('youtube_playlist_url')
                ->constrained('volunteers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('solicitations_handler_volunteer_id');
        });
    }
};
