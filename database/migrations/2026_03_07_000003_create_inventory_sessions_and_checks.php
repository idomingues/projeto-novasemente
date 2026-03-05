<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained('churches')->nullOnDelete();
            $table->string('name');
            $table->date('scheduled_date')->nullable();
            $table->foreignId('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ministry_id')->nullable()->constrained('ministries')->nullOnDelete();
            $table->string('status')->default('open');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_session_id')->constrained('inventory_sessions')->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->timestamp('checked_at')->nullable();
            $table->string('location_found')->nullable();
            $table->string('status')->default('ok');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_checks');
        Schema::dropIfExists('inventory_sessions');
    }
};
