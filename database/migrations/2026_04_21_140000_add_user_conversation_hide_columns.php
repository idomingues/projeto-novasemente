<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('church_solicitations', function (Blueprint $table) {
            $table->timestamp('member_hidden_at')->nullable()->after('completed_at');
            $table->timestamp('leader_hidden_at')->nullable()->after('member_hidden_at');
        });

        Schema::table('app_support_tickets', function (Blueprint $table) {
            $table->timestamp('user_hidden_at')->nullable()->after('closed_at');
        });
    }

    public function down(): void
    {
        Schema::table('church_solicitations', function (Blueprint $table) {
            $table->dropColumn(['member_hidden_at', 'leader_hidden_at']);
        });

        Schema::table('app_support_tickets', function (Blueprint $table) {
            $table->dropColumn('user_hidden_at');
        });
    }
};
