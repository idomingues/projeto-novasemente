<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_messages', function (Blueprint $table) {
            $table->string('moderation_status', 32)->default('published')->after('is_hidden');
            $table->text('moderation_note')->nullable()->after('moderation_status');
            $table->foreignId('reviewed_by')->nullable()->after('moderation_note')->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');

            $table->index(['church_id', 'moderation_status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('mission_messages', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropIndex(['church_id', 'moderation_status', 'created_at']);
            $table->dropColumn(['moderation_status', 'moderation_note', 'reviewed_by', 'reviewed_at']);
        });
    }
};
