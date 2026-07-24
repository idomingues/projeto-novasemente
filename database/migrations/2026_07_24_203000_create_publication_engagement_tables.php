<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publication_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('guest_key', 64)->nullable();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject_type', 40);
            $table->unsignedBigInteger('subject_id');
            $table->timestamps();

            $table->unique(['user_id', 'subject_type', 'subject_id'], 'publication_likes_user_subject_unique');
            $table->unique(['guest_key', 'subject_type', 'subject_id'], 'publication_likes_guest_subject_unique');
            $table->index(['subject_type', 'subject_id'], 'publication_likes_subject_index');
            $table->index(['church_id', 'created_at']);
        });

        Schema::create('publication_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('church_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject_type', 40);
            $table->unsignedBigInteger('subject_id');
            $table->text('body');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['subject_type', 'subject_id', 'created_at'], 'publication_comments_subject_created_index');
            $table->index(['church_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publication_comments');
        Schema::dropIfExists('publication_likes');
    }
};
