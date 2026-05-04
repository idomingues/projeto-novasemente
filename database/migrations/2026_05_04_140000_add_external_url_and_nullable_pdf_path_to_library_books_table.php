<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->string('external_url', 2048)->nullable()->after('pdf_path');
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->string('pdf_path', 512)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('library_books', function (Blueprint $table) {
            $table->dropColumn('external_url');
        });

        Schema::table('library_books', function (Blueprint $table) {
            $table->string('pdf_path', 512)->nullable(false)->change();
        });
    }
};
