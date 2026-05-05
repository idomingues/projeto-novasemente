<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bible_books', function (Blueprint $table) {
            $table->string('key', 24)->after('id');
        });

        Schema::table('bible_books', function (Blueprint $table) {
            // Drop old unique index on abbrev (created by initial migration).
            $table->dropUnique('bible_books_abbrev_unique');
            $table->unique('key');
            $table->index('abbrev');
        });
    }

    public function down(): void
    {
        Schema::table('bible_books', function (Blueprint $table) {
            $table->dropIndex(['abbrev']);
            $table->dropUnique(['key']);
            $table->unique('abbrev');
            $table->dropColumn('key');
        });
    }
};

