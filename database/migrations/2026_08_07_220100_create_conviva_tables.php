<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conviva_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('room_name');
            $table->string('teacher_name');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['church_id', 'is_active', 'sort_order']);
        });

        Schema::create('conviva_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conviva_class_id')->constrained('conviva_classes')->restrictOnDelete();
            $table->date('checkin_date');
            $table->timestamps();

            $table->unique(['church_id', 'user_id', 'checkin_date']);
            $table->index(['church_id', 'checkin_date', 'conviva_class_id']);
        });

        Schema::create('conviva_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conviva_class_id')->nullable()->constrained('conviva_classes')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'church_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conviva_preferences');
        Schema::dropIfExists('conviva_checkins');
        Schema::dropIfExists('conviva_classes');
    }
};
