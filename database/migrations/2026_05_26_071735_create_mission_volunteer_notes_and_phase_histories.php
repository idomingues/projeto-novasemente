<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mission_volunteer_phase_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('from_phase_id')->nullable()->constrained('mission_phases')->nullOnDelete();
            $table->foreignId('to_phase_id')->nullable()->constrained('mission_phases')->nullOnDelete();
            $table->string('from_phase_name')->nullable();
            $table->string('to_phase_name')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('mission_volunteer_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mission_volunteer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mission_volunteer_notes');
        Schema::dropIfExists('mission_volunteer_phase_histories');
    }
};
