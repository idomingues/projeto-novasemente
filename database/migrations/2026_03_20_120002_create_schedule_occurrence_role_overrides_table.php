<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_occurrence_role_overrides', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('schedule_assignment_id');
            $table->date('occurrence_date');
            $table->unsignedBigInteger('schedule_role_id')->nullable();
            $table->timestamps();

            $table->foreign('schedule_assignment_id', 'sched_role_ovr_asgn_fk')
                ->references('id')->on('schedule_assignments')->cascadeOnDelete();
            $table->foreign('schedule_role_id', 'sched_role_ovr_role_fk')
                ->references('id')->on('schedule_roles')->nullOnDelete();

            $table->unique(['schedule_assignment_id', 'occurrence_date'], 'sched_role_ovr_asgn_date_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_occurrence_role_overrides');
    }
};
