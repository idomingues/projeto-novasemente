<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('photo_albums', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained('churches')->nullOnDelete();
            $table->string('title');
            $table->string('drive_folder_url', 1024);
            $table->string('cover_image_url', 1024)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photo_albums');
    }
};

