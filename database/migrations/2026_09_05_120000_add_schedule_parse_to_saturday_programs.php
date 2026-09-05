<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saturday_programs', function (Blueprint $table) {
            $table->json('schedule')->nullable()->after('pdf_path');
            $table->string('parse_status', 20)->default('pending')->after('schedule');
            $table->timestamp('parsed_at')->nullable()->after('parse_status');
            $table->text('parse_error')->nullable()->after('parsed_at');
        });
    }

    public function down(): void
    {
        Schema::table('saturday_programs', function (Blueprint $table) {
            $table->dropColumn(['schedule', 'parse_status', 'parsed_at', 'parse_error']);
        });
    }
};
