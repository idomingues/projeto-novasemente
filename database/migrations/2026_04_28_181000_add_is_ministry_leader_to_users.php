<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_ministry_leader')) {
                $table->boolean('is_ministry_leader')->default(false)->after('is_volunteer');
                $table->index(['church_id', 'is_ministry_leader'], 'users_church_leader_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_ministry_leader')) {
                try {
                    $table->dropIndex('users_church_leader_idx');
                } catch (\Throwable) {
                }
                $table->dropColumn('is_ministry_leader');
            }
        });
    }
};

