<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('schedule_role_id')->nullable()->constrained()->nullOnDelete();
            /** 1-5 = qual sábado do mês (recorrente); null = escala extra com schedule_date */
            $table->unsignedTinyInteger('saturday_number')->nullable();
            /** Data específica para escala extra; null quando recorrente */
            $table->date('schedule_date')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'refused'])->default('pending');
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamps();

            $table->index(['saturday_number', 'schedule_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_assignments');
    }
};
