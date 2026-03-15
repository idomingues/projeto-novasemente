<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('acervo_items', function (Blueprint $table) {
            $table->id();
            $table->string('url', 512);
            $table->string('title');
            $table->string('thumbnail_url', 512)->nullable();
            $table->unsignedInteger('video_count')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acervo_items');
    }
};
