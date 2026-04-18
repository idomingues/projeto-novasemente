<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ministry_volunteer', function (Blueprint $table) {
            $table->string('clearance_status', 32)->default('pending')->after('ministry_id');
            $table->timestamp('cleared_at')->nullable()->after('clearance_status');
            $table->foreignId('cleared_by_user_id')->nullable()->after('cleared_at')->constrained('users')->nullOnDelete();
        });

        DB::table('ministry_volunteer')->update([
            'clearance_status' => 'cleared',
            'cleared_at' => now(),
        ]);

        Schema::create('volunteer_clearance_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('volunteer_clearance_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ministry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('criterion_id')->constrained('volunteer_clearance_criteria')->cascadeOnDelete();
            $table->foreignId('checked_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('checked_at');
            $table->timestamps();
            $table->unique(['volunteer_id', 'ministry_id', 'criterion_id'], 'vol_clearance_check_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('volunteer_clearance_checks');
        Schema::dropIfExists('volunteer_clearance_criteria');

        Schema::table('ministry_volunteer', function (Blueprint $table) {
            $table->dropForeign(['cleared_by_user_id']);
            $table->dropColumn(['clearance_status', 'cleared_at', 'cleared_by_user_id']);
        });
    }
};
