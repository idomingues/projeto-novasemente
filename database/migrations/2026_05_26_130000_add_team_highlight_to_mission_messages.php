<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mission_messages', function (Blueprint $table) {
            $table->boolean('is_team_highlight')->default(false)->after('is_hidden');
        });
    }

    public function down(): void
    {
        Schema::table('mission_messages', function (Blueprint $table) {
            $table->dropColumn('is_team_highlight');
        });
    }
};
