<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donation_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('goal_amount', 12, 2);
            $table->decimal('raised_amount', 12, 2)->default(0);
            $table->string('status', 20)->default('active');
            $table->date('ends_at')->nullable();
            $table->string('cover_image_path')->nullable();
            $table->boolean('allow_over_goal')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['church_id', 'status']);
        });

        Schema::create('campaign_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('donation_campaigns')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->decimal('ocr_suggested_amount', 12, 2)->nullable();
            $table->string('receipt_path');
            $table->string('receipt_hash', 64)->unique();
            $table->boolean('is_anonymous')->default(false);
            $table->timestamp('confirmed_at');
            $table->timestamps();

            $table->index(['campaign_id', 'confirmed_at']);
            $table->index('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_donations');
        Schema::dropIfExists('donation_campaigns');
    }
};
