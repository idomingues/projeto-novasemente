<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('talent_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['church_id', 'slug']);
        });

        Schema::create('talent_module_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('confirmed_at');
            $table->timestamps();

            $table->unique(['user_id', 'church_id']);
        });

        Schema::create('talent_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('talent_categories')->restrictOnDelete();
            $table->string('title');
            $table->string('type', 20);
            $table->text('description');
            $table->string('locality')->nullable();
            $table->text('availability')->nullable();
            $table->boolean('allows_exchange')->default(false);
            $table->boolean('allows_negotiation')->default(true);
            $table->text('notes')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamp('member_declaration_at')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['category_id', 'status']);
            $table->index('type');
        });

        Schema::create('talent_interests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('talent_listings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->unique(['listing_id', 'user_id']);
            $table->index(['user_id', 'status']);
            $table->index(['listing_id', 'status']);
        });

        Schema::create('talent_interest_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('interest_id')->constrained('talent_interests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['interest_id', 'created_at']);
        });

        Schema::create('talent_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('talent_listings')->cascadeOnDelete();
            $table->foreignId('interest_id')->constrained('talent_interests')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('visible');
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->unique(['interest_id', 'reviewer_user_id']);
            $table->index(['reviewed_user_id', 'status']);
        });

        Schema::create('talent_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('listing_id')->nullable()->constrained('talent_listings')->nullOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 40);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'status']);
            $table->index(['listing_id', 'status']);
        });

        Schema::create('talent_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 60);
            $table->string('subject_type', 80)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('talent_audit_logs');
        Schema::dropIfExists('talent_reports');
        Schema::dropIfExists('talent_reviews');
        Schema::dropIfExists('talent_interest_messages');
        Schema::dropIfExists('talent_interests');
        Schema::dropIfExists('talent_listings');
        Schema::dropIfExists('talent_module_memberships');
        Schema::dropIfExists('talent_categories');
    }
};
