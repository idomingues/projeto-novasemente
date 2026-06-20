<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('churches') && ! Schema::hasColumn('churches', 'mission_whatsapp_default_message')) {
            Schema::table('churches', function (Blueprint $table) {
                $table->text('mission_whatsapp_default_message')->nullable()->after('ministry_invitation_intro');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('churches', 'mission_whatsapp_default_message')) {
            Schema::table('churches', function (Blueprint $table) {
                $table->dropColumn('mission_whatsapp_default_message');
            });
        }
    }
};
