<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropForeign(['church_id']);
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->unsignedBigInteger('church_id')->nullable()->change();
            $table->string('source_pdf_url', 512)->nullable()->after('pdf_path');
            $table->string('source_cover_url', 512)->nullable()->after('cover_path');
            $table->timestamp('pdf_cached_at')->nullable()->after('source_pdf_url');
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->foreign('church_id')->references('id')->on('churches')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropForeign(['church_id']);
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->dropColumn(['source_pdf_url', 'source_cover_url', 'pdf_cached_at']);
            $table->unsignedBigInteger('church_id')->nullable(false)->change();
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->foreign('church_id')->references('id')->on('churches')->cascadeOnDelete();
        });
    }
};
