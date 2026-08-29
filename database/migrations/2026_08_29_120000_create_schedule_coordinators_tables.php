<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_coordinators', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ministry_id')->constrained('ministries')->cascadeOnDelete();
            $table->foreignId('volunteer_id')->constrained('volunteers')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            /** 1-5 = qual sábado do mês; null = escala extra com schedule_date */
            $table->unsignedTinyInteger('saturday_number')->nullable();
            $table->date('schedule_date')->nullable();
            $table->boolean('recurring')->default(true);
            $table->unsignedTinyInteger('assignment_month')->nullable();
            $table->unsignedSmallInteger('assignment_year')->nullable();
            $table->timestamps();

            $table->index(['ministry_id', 'saturday_number']);
            $table->index(['ministry_id', 'schedule_date']);
            $table->index(['user_id']);
            $table->index(['volunteer_id']);
        });

        Schema::create('schedule_coordinator_skips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_coordinator_id')->constrained('schedule_coordinators')->cascadeOnDelete();
            $table->date('occurrence_date');
            $table->timestamps();

            $table->unique(['schedule_coordinator_id', 'occurrence_date'], 'sched_coord_skip_date_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_coordinator_skips');
        Schema::dropIfExists('schedule_coordinators');
    }
};
