<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('churches') && ! Schema::hasColumn('churches', 'ministry_invitation_intro')) {
            Schema::table('churches', function (Blueprint $table) {
                $table->text('ministry_invitation_intro')->nullable()->after('description');
            });
        }

        if (Schema::hasTable('volunteer_ministry_invitations') && ! Schema::hasColumn('volunteer_ministry_invitations', 'intro_message')) {
            Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
                $table->text('intro_message')->nullable()->after('expires_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('volunteer_ministry_invitations', 'intro_message')) {
            Schema::table('volunteer_ministry_invitations', function (Blueprint $table) {
                $table->dropColumn('intro_message');
            });
        }
        if (Schema::hasColumn('churches', 'ministry_invitation_intro')) {
            Schema::table('churches', function (Blueprint $table) {
                $table->dropColumn('ministry_invitation_intro');
            });
        }
    }
};
