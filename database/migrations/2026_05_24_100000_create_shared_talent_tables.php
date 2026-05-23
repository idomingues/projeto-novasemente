<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shared_talent_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['church_id', 'slug']);
        });

        Schema::create('shared_talent_module_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('confirmed_at');
            $table->timestamps();

            $table->unique(['user_id', 'church_id']);
        });

        Schema::create('shared_talent_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('shared_talent_categories')->restrictOnDelete();
            $table->string('title');
            $table->text('description');
            $table->unsignedSmallInteger('slots_total')->default(1);
            $table->unsignedSmallInteger('slots_filled')->default(0);
            $table->string('age_range', 20)->default('all');
            $table->string('age_range_notes')->nullable();
            $table->string('modality', 20);
            $table->string('locality')->nullable();
            $table->text('available_days')->nullable();
            $table->string('schedule_time')->nullable();
            $table->string('frequency')->nullable();
            $table->string('duration_estimate')->nullable();
            $table->text('notes')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamp('member_declaration_at')->nullable();
            $table->timestamps();

            $table->index(['church_id', 'status']);
            $table->index(['category_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index('modality');
            $table->index('age_range');
        });

        Schema::create('shared_talent_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('shared_talent_listings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->string('status', 30)->default('awaiting_approval');
            $table->timestamps();

            $table->unique(['listing_id', 'user_id']);
            $table->index(['user_id', 'status']);
            $table->index(['listing_id', 'status']);
        });

        Schema::create('shared_talent_announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('shared_talent_listings')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['listing_id', 'created_at']);
        });

        Schema::create('shared_talent_enrollment_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('shared_talent_enrollments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['enrollment_id', 'created_at']);
        });

        Schema::create('shared_talent_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listing_id')->constrained('shared_talent_listings')->cascadeOnDelete();
            $table->foreignId('enrollment_id')->constrained('shared_talent_enrollments')->cascadeOnDelete();
            $table->foreignId('reviewer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->string('status', 20)->default('visible');
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();

            $table->unique(['enrollment_id', 'reviewer_user_id']);
            $table->index(['reviewed_user_id', 'status']);
        });

        Schema::create('shared_talent_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('listing_id')->nullable()->constrained('shared_talent_listings')->nullOnDelete();
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

        Schema::create('shared_talent_audit_logs', function (Blueprint $table) {
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
        Schema::dropIfExists('shared_talent_audit_logs');
        Schema::dropIfExists('shared_talent_reports');
        Schema::dropIfExists('shared_talent_reviews');
        Schema::dropIfExists('shared_talent_enrollment_messages');
        Schema::dropIfExists('shared_talent_announcements');
        Schema::dropIfExists('shared_talent_enrollments');
        Schema::dropIfExists('shared_talent_listings');
        Schema::dropIfExists('shared_talent_module_memberships');
        Schema::dropIfExists('shared_talent_categories');
    }
};
