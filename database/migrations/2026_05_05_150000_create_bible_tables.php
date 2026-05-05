<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bible_books', function (Blueprint $table) {
            $table->id();
            $table->string('abbrev', 16)->unique();
            $table->string('name', 80);
            $table->string('testament', 8); // old | new
            $table->unsignedSmallInteger('position');
            $table->unsignedSmallInteger('chapters_count');
            $table->timestamps();

            $table->index(['testament', 'position']);
        });

        Schema::create('bible_verses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('book_id')->constrained('bible_books')->cascadeOnDelete();
            $table->unsignedSmallInteger('chapter');
            $table->unsignedSmallInteger('verse');
            $table->longText('text');
            $table->timestamps();

            $table->unique(['book_id', 'chapter', 'verse']);
            $table->index(['book_id', 'chapter']);
        });

        // Optional Full-Text (MySQL/MariaDB only). SQLite/Postgres will ignore.
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE bible_verses ADD FULLTEXT bible_verses_text_fulltext (text)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bible_verses');
        Schema::dropIfExists('bible_books');
    }
};

