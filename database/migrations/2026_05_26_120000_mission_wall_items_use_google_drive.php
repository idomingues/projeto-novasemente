<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_wall_items', function (Blueprint $table) {
            $table->string('title')->default('Mural')->after('church_id');
            $table->string('photographer_name')->nullable()->after('title');
            $table->string('drive_folder_url', 1024)->nullable()->after('photographer_name');
            $table->string('cover_image_url', 1024)->nullable()->after('drive_folder_url');
        });

        Schema::table('mission_wall_items', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'caption']);
        });
    }

    public function down(): void
    {
        Schema::table('mission_wall_items', function (Blueprint $table) {
            $table->string('image_path')->after('church_id');
            $table->string('caption')->nullable()->after('image_path');
        });

        Schema::table('mission_wall_items', function (Blueprint $table) {
            $table->dropColumn(['title', 'photographer_name', 'drive_folder_url', 'cover_image_url']);
        });
    }
};
