<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->boolean('recurring')->default(true)->after('schedule_date');
            $table->unsignedTinyInteger('assignment_month')->nullable()->after('recurring');
            $table->unsignedSmallInteger('assignment_year')->nullable()->after('assignment_month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->dropColumn(['recurring', 'assignment_month', 'assignment_year']);
        });
    }
};
