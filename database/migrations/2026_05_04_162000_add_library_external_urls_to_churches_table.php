<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->string('library_meditation_url', 2048)->nullable()->after('youtube_live_url');
            $table->string('library_lesson_url', 2048)->nullable()->after('library_meditation_url');
        });
    }

    public function down(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->dropColumn(['library_meditation_url', 'library_lesson_url']);
        });
    }
};

