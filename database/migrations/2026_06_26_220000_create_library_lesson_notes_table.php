<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('library_lesson_notes');

        Schema::create('library_lesson_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('lesson_source_url', 2048);
            $table->char('lesson_source_hash', 64);
            $table->string('day_slug', 64);
            $table->text('body');
            $table->timestamps();

            $table->unique(['user_id', 'church_id', 'lesson_source_hash', 'day_slug'], 'library_lesson_notes_user_lesson_day_unique');
            $table->index(['user_id', 'church_id', 'lesson_source_hash'], 'library_lesson_notes_user_lesson_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_lesson_notes');
    }
};
