<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('church_conversations', function (Blueprint $table) {
            if (! Schema::hasColumn('church_conversations', 'staff_alerted_at')) {
                $table->timestamp('staff_alerted_at')->nullable()->after('last_activity_at');
            }
            if (! Schema::hasColumn('church_conversations', 'member_alerted_at')) {
                $table->timestamp('member_alerted_at')->nullable()->after('staff_alerted_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('church_conversations', function (Blueprint $table) {
            if (Schema::hasColumn('church_conversations', 'member_alerted_at')) {
                $table->dropColumn('member_alerted_at');
            }
            if (Schema::hasColumn('church_conversations', 'staff_alerted_at')) {
                $table->dropColumn('staff_alerted_at');
            }
        });
    }
};
