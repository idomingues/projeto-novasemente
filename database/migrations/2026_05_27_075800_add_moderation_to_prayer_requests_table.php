<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prayer_requests', function (Blueprint $table) {
            $table->boolean('needs_review')->default(false)->after('active');
            $table->text('moderation_note')->nullable()->after('needs_review');

            $table->index(['church_id', 'active', 'needs_review', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('prayer_requests', function (Blueprint $table) {
            $table->dropIndex(['church_id', 'active', 'needs_review', 'created_at']);
            $table->dropColumn(['needs_review', 'moderation_note']);
        });
    }
};

