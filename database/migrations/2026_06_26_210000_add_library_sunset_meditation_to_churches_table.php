<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->string('library_sunset_meditation_pdf_path', 512)->nullable()->after('library_lesson_url');
            $table->json('library_sunset_meditation_segments')->nullable()->after('library_sunset_meditation_pdf_path');
            $table->unsignedSmallInteger('library_sunset_meditation_year')->nullable()->after('library_sunset_meditation_segments');
        });
    }

    public function down(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            $table->dropColumn([
                'library_sunset_meditation_pdf_path',
                'library_sunset_meditation_segments',
                'library_sunset_meditation_year',
            ]);
        });
    }
};
