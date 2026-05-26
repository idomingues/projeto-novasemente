<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_phases', function (Blueprint $table) {
            $table->unsignedSmallInteger('sla_days')->default(7)->after('sort_order');
        });

        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->timestamp('phase_entered_at')->nullable()->after('mission_phase_id');
        });

        $nowFn = Schema::getConnection()->getDriverName() === 'sqlite'
            ? "datetime('now')"
            : 'NOW()';

        DB::table('mission_volunteers')
            ->whereNotNull('mission_phase_id')
            ->update(['phase_entered_at' => DB::raw("COALESCE(updated_at, created_at, {$nowFn})")]);

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_mission_team')->default(false)->after('is_ministry_leader');
        });

        Schema::create('mission_user_phases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_phase_id')->constrained('mission_phases')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'mission_phase_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mission_user_phases');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_mission_team');
        });

        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->dropColumn('phase_entered_at');
        });

        Schema::table('mission_phases', function (Blueprint $table) {
            $table->dropColumn('sla_days');
        });
    }
};
