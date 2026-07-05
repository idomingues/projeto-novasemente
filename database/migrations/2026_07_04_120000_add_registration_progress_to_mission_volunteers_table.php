<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->timestamp('registration_completed_at')->nullable()->after('submitted_by_user_id');
            $table->string('registration_step', 64)->nullable()->after('registration_completed_at');
        });

        DB::table('mission_volunteers')
            ->whereNull('registration_completed_at')
            ->whereNotNull('created_at')
            ->update(['registration_completed_at' => DB::raw('created_at')]);

        DB::table('mission_volunteers')
            ->whereNull('registration_completed_at')
            ->update(['registration_completed_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('mission_volunteers', function (Blueprint $table) {
            $table->dropColumn(['registration_completed_at', 'registration_step']);
        });
    }
};
