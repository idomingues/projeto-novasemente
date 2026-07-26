<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('churches', function (Blueprint $table) {
            if (! Schema::hasColumn('churches', 'conversation_fallback_ministry_id')) {
                $table->foreignId('conversation_fallback_ministry_id')
                    ->nullable()
                    ->after('solicitations_handler_volunteer_id')
                    ->constrained('ministries')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('churches', 'conversation_reopen_days')) {
                $table->unsignedSmallInteger('conversation_reopen_days')->default(15)->after('conversation_fallback_ministry_id');
            }
        });

        Schema::create('church_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject', 150)->nullable();
            $table->foreignId('initial_ministry_id')->constrained('ministries')->restrictOnDelete();
            $table->foreignId('current_ministry_id')->constrained('ministries')->restrictOnDelete();
            $table->foreignId('preferred_leader_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assignee_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 32)->default('new')->index();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('closed_by_role', 32)->nullable();
            $table->timestamp('reopen_until')->nullable();
            $table->timestamp('member_archived_at')->nullable();
            $table->boolean('involves_minor')->default(false);
            $table->unsignedBigInteger('legacy_solicitation_id')->nullable()->unique();
            $table->timestamps();

            $table->index(['church_id', 'member_user_id', 'status']);
            $table->index(['church_id', 'current_ministry_id', 'status']);
            $table->index(['assignee_user_id', 'status']);
        });

        Schema::create('church_conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
            $table->foreignId('author_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('author_role', 16);
            $table->text('body');
            $table->string('kind', 16)->default('public');
            $table->timestamp('edited_at')->nullable();
            $table->timestamp('member_hidden_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
            $table->index(['conversation_id', 'kind']);
        });

        Schema::create('church_conversation_message_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('church_conversation_messages')->cascadeOnDelete();
            $table->text('previous_body');
            $table->foreignId('changed_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('church_conversation_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('last_read_message_id')->nullable()->constrained('church_conversation_messages')->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
        });

        Schema::create('church_conversation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
            $table->string('type', 64);
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['conversation_id', 'created_at']);
        });

        Schema::create('church_conversation_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
            $table->foreignId('from_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 500)->nullable();
            $table->foreignId('transferred_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('church_conversation_forwards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
            $table->foreignId('from_ministry_id')->constrained('ministries')->restrictOnDelete();
            $table->foreignId('to_ministry_id')->constrained('ministries')->restrictOnDelete();
            $table->foreignId('to_leader_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 500)->nullable();
            $table->text('internal_note')->nullable();
            $table->foreignId('forwarded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('church_conversation_forwards');
        Schema::dropIfExists('church_conversation_transfers');
        Schema::dropIfExists('church_conversation_events');
        Schema::dropIfExists('church_conversation_reads');
        Schema::dropIfExists('church_conversation_message_versions');
        Schema::dropIfExists('church_conversation_messages');
        Schema::dropIfExists('church_conversations');

        Schema::table('churches', function (Blueprint $table) {
            if (Schema::hasColumn('churches', 'conversation_fallback_ministry_id')) {
                $table->dropConstrainedForeignId('conversation_fallback_ministry_id');
            }
            if (Schema::hasColumn('churches', 'conversation_reopen_days')) {
                $table->dropColumn('conversation_reopen_days');
            }
        });
    }
};
