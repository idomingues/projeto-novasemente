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
            ->select('church_id')
            ->distinct()
            ->pluck('church_id');

        foreach ($churchIds as $churchId) {
            $exists = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
                ->exists();

            if ($exists) {
                continue;
            }

            $trainingSort = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['em treinamento'])
                ->orderBy('sort_order')
                ->value('sort_order');

            $sortOrder = $trainingSort !== null
                ? max(0, (int) $trainingSort - 1)
                : (int) DB::table('volunteer_pipeline_stages')->where('church_id', $churchId)->max('sort_order') + 10;

            DB::table('volunteer_pipeline_stages')->insert([
                'church_id' => $churchId,
                'name' => 'Encaminhado',
                'sort_order' => $sortOrder,
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
            ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
            ->delete();
    }
};
