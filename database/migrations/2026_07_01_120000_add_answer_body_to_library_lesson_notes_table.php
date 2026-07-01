<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('library_lesson_notes', function (Blueprint $table) {
            $table->text('answer_body')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('library_lesson_notes', function (Blueprint $table) {
            $table->dropColumn('answer_body');
        });
    }
};
