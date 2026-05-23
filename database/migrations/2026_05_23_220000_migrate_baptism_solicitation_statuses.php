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

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->whereNotNull('staff_archived_at')
            ->update([
                'status' => 'archived',
                'staff_archived_at' => null,
            ]);

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'cancelled')
            ->update(['status' => 'archived']);

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'in_progress')
            ->update(['status' => 'waiting']);

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'completed')
            ->update(['status' => 'baptized']);
    }

    public function down(): void
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('church_solicitations')) {
            return;
        }

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'waiting')
            ->update(['status' => 'in_progress']);

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'baptized')
            ->update(['status' => 'completed']);

        DB::table('church_solicitations')
            ->where('type', 'baptism')
            ->where('status', 'archived')
            ->update(['status' => 'cancelled']);
    }
};
