<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->string('content_type', 20)->default('article')->after('slug');
            $table->string('youtube_url', 500)->nullable()->after('body');
            $table->string('pdf_path', 255)->nullable()->after('youtube_url');
        });
    }

    public function down(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->dropColumn(['content_type', 'youtube_url', 'pdf_path']);
        });
    }
};
