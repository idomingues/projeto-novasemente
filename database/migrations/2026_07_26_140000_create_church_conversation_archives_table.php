<?php

use App\Models\ChurchConversation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('church_conversation_archives')) {
            Schema::create('church_conversation_archives', function (Blueprint $table) {
                $table->id();
                $table->foreignId('conversation_id')->constrained('church_conversations')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('archived_at');
                $table->timestamps();

                $table->unique(['conversation_id', 'user_id']);
                $table->index(['user_id', 'archived_at']);
            });
        }

        // Migra o arquivamento legado (só do membro) para o modelo por usuário.
        if (Schema::hasColumn('church_conversations', 'member_archived_at')) {
            ChurchConversation::query()
                ->whereNotNull('member_archived_at')
                ->orderBy('id')
                ->each(function (ChurchConversation $conversation) {
                    DB::table('church_conversation_archives')->updateOrInsert(
                        [
                            'conversation_id' => $conversation->id,
                            'user_id' => $conversation->member_user_id,
                        ],
                        [
                            'archived_at' => $conversation->member_archived_at,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    );
                });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('church_conversation_archives');
    }
};
