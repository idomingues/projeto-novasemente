<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('church_solicitations')) {
            return;
        }

        $pastoralTypes = ['bible_study', 'baby_presentation', 'pastor_visit', 'other', 'leader_chat'];

        DB::table('church_solicitations')
            ->whereIn('type', $pastoralTypes)
            ->whereNotNull('staff_archived_at')
            ->update([
                'status' => 'archived',
                'staff_archived_at' => null,
            ]);

        DB::table('church_solicitations')
            ->whereIn('type', $pastoralTypes)
            ->where('status', 'in_progress')
            ->update(['status' => 'pending']);
    }

    public function down(): void
    {
        // Sem reversão automática — estados misturados após migração.
    }
};
