<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mission_trip_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('trip_slug')->default('thailand-myanmar-2026');
            $table->string('full_name');
            $table->string('instagram')->nullable();
            $table->string('phone', 50);
            $table->string('email');
            $table->boolean('has_passport');
            $table->boolean('participated_foreign_mission_before');
            $table->string('profession');
            $table->string('profession_other')->nullable();
            $table->timestamps();

            $table->unique(['church_id', 'trip_slug', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mission_trip_registrations');
    }
};
