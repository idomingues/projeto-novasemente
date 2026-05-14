<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            ! Schema::hasTable('volunteer_pipeline_stages')
            || ! Schema::hasTable('volunteer_church_pipelines')
            || ! Schema::hasTable('volunteer_ministry_invitations')
        ) {
            return;
        }

        $churchIds = DB::table('volunteer_pipeline_stages')
            ->select('church_id')
            ->distinct()
            ->pluck('church_id');

        foreach ($churchIds as $churchId) {
            $encaminhadoStageId = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->value('id');

            if ($encaminhadoStageId === null) {
                $trainingSort = DB::table('volunteer_pipeline_stages')
                    ->where('church_id', $churchId)
                    ->whereRaw('LOWER(TRIM(name)) = ?', ['em treinamento'])
                    ->orderBy('sort_order')
                    ->value('sort_order');

                $sortOrder = $trainingSort !== null
                    ? max(0, (int) $trainingSort - 1)
                    : (int) DB::table('volunteer_pipeline_stages')->where('church_id', $churchId)->max('sort_order') + 10;

                $encaminhadoStageId = DB::table('volunteer_pipeline_stages')->insertGetId([
                    'church_id' => $churchId,
                    'name' => 'Encaminhado',
                    'sort_order' => $sortOrder,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $stageIdsToReplace = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->where(function ($q): void {
                    $q->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
                        ->orWhereRaw('LOWER(TRIM(name)) = ?', ['em treinamento']);
                })
                ->pluck('id');

            if ($stageIdsToReplace->isEmpty()) {
                continue;
            }

            $volunteerIds = DB::table('volunteer_ministry_invitations')
                ->where('church_id', $churchId)
                ->distinct()
                ->orderBy('volunteer_id')
                ->pluck('volunteer_id');

            if ($volunteerIds->isEmpty()) {
                continue;
            }

            foreach ($volunteerIds->chunk(500) as $chunkIds) {
                DB::table('volunteer_church_pipelines')
                    ->where('church_id', $churchId)
                    ->whereIn('volunteer_id', $chunkIds->values()->all())
                    ->whereIn('stage_id', $stageIdsToReplace->values()->all())
                    ->update([
                        'stage_id' => (int) $encaminhadoStageId,
                        'updated_at' => now(),
                    ]);
            }
        }
    }

    public function down(): void
    {
        // Sem rollback automático do backfill para evitar regressão de estágio.
    }
};
