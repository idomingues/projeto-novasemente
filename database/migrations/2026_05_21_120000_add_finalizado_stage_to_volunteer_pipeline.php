<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        $churchIds = DB::table('volunteer_pipeline_stages')
            ->distinct()
            ->pluck('church_id')
            ->map(fn ($id) => (int) $id);

        foreach ($churchIds as $churchId) {
            $exists = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['finalizado'])
                ->exists();

            if ($exists) {
                continue;
            }

            $maxSort = (int) DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->max('sort_order');

            DB::table('volunteer_pipeline_stages')->insert([
                'church_id' => $churchId,
                'name' => 'Finalizado',
                'sort_order' => $maxSort + 10,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        DB::table('volunteer_pipeline_stages')
            ->whereRaw('LOWER(TRIM(name)) = ?', ['finalizado'])
            ->delete();
    }
};
