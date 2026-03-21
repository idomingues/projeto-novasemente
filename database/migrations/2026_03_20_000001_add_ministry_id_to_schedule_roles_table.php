<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_roles', function (Blueprint $table) {
            $table->foreignId('ministry_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('schedule_roles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ministry_id');
        });
    }
};
