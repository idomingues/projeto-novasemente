<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_occurrence_skips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_assignment_id')->constrained('schedule_assignments')->cascadeOnDelete();
            $table->date('occurrence_date');
            $table->timestamps();

            $table->unique(['schedule_assignment_id', 'occurrence_date'], 'sched_skip_asgn_date_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_occurrence_skips');
    }
};
