<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_novelties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('title', 80);
            $table->string('body', 280);
            $table->string('module_key', 64);
            $table->string('route_name', 120);
            $table->boolean('is_active')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['church_id', 'is_active', 'published_at']);
        });

        Schema::create('user_dismissed_app_novelties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('app_novelty_id')->constrained('app_novelties')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'app_novelty_id'], 'user_app_novelty_dismissed_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_dismissed_app_novelties');
        Schema::dropIfExists('app_novelties');
    }
};
