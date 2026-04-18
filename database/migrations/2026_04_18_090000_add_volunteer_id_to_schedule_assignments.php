<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->foreignId('volunteer_id')->nullable()->after('member_id')->constrained('volunteers')->nullOnDelete();
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable()->change();
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->foreign('member_id')->references('id')->on('members')->nullOnDelete();
        });
    }

    public function down(): void
    {
        DB::table('schedule_assignments')->whereNull('member_id')->delete();

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->dropForeign(['volunteer_id']);
            $table->dropColumn('volunteer_id');
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable(false)->change();
        });

        Schema::table('schedule_assignments', function (Blueprint $table) {
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }
};
