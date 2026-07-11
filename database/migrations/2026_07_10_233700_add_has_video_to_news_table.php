<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->boolean('has_video')->default(false)->after('video_path');
        });

        // Backfill: YouTube e feed com arquivo de vídeo já eram tratados como vídeo.
        DB::table('news')
            ->where('content_type', 'youtube')
            ->update(['has_video' => true]);

        DB::table('news')
            ->where('content_type', 'instagram_feed')
            ->whereNotNull('video_path')
            ->where('video_path', '!=', '')
            ->update(['has_video' => true]);
    }

    public function down(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->dropColumn('has_video');
        });
    }
};
