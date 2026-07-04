<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('charity_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('goal_amount', 12, 2);
            $table->decimal('raised_amount', 12, 2)->default(0);
            $table->string('status', 20)->default('active');
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->string('cover_image_path')->nullable();
            $table->string('story_video_url', 512)->nullable();
            $table->text('thanks_message')->nullable();
            $table->timestamp('thanks_published_at')->nullable();
            $table->timestamp('thanks_donors_notified_at')->nullable();
            $table->boolean('allow_over_goal')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['church_id', 'status']);
        });

        Schema::create('charity_donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('charity_campaigns')->cascadeOnDelete();
            $table->string('source', 20)->default('app');
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('external_donor_name')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('ocr_suggested_amount', 12, 2)->nullable();
            $table->string('receipt_path')->nullable();
            $table->string('receipt_hash', 64)->nullable()->unique();
            $table->boolean('is_anonymous')->default(false);
            $table->text('manual_registration_note')->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('donor_email_confirmation_requested')->default(false);
            $table->timestamp('confirmed_at');
            $table->text('dispute_message')->nullable();
            $table->string('dispute_status', 20)->nullable();
            $table->timestamp('disputed_at')->nullable();
            $table->text('dispute_resolution_note')->nullable();
            $table->timestamp('dispute_resolved_at')->nullable();
            $table->decimal('amount_before_adjustment', 12, 2)->nullable();
            $table->text('adjustment_note')->nullable();
            $table->foreignId('adjusted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('adjusted_at')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'confirmed_at']);
            $table->index('confirmed_at');
            $table->index('dispute_status');
        });

        Schema::create('charity_campaign_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('charity_campaigns')->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('image_path');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['campaign_id', 'kind']);
        });

        Schema::create('charity_donation_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('charity_donation_id')->constrained('charity_donations')->cascadeOnDelete();
            $table->decimal('amount_before', 12, 2);
            $table->decimal('amount_after', 12, 2);
            $table->text('adjustment_note');
            $table->foreignId('adjusted_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['charity_donation_id', 'created_at'], 'charity_donation_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('charity_donation_adjustments');
        Schema::dropIfExists('charity_campaign_photos');
        Schema::dropIfExists('charity_donations');
        Schema::dropIfExists('charity_campaigns');
    }
};
