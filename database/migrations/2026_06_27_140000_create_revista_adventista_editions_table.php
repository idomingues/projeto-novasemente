<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revista_adventista_editions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cpb_edition_id')->unique();
            $table->unsignedSmallInteger('year')->index();
            $table->string('month_code', 4);
            $table->unsignedTinyInteger('month')->index();
            $table->string('title');
            $table->string('source_cover_url')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('source_pdf_url')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamp('pdf_cached_at')->nullable();
            $table->timestamp('cover_cached_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revista_adventista_editions');
    }
};
