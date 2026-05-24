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
            || ! Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')
        ) {
            return;
        }

        $churchIds = DB::table('volunteer_pipeline_stages')
            ->select('church_id')
            ->distinct()
            ->pluck('church_id');

        foreach ($churchIds as $churchId) {
            $macroStageIds = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->where(function ($q): void {
                    $q->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
                        ->orWhereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
                        ->orWhereRaw('LOWER(TRIM(name)) = ?', ['finalizado']);
                })
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            if ($macroStageIds === []) {
                continue;
            }

            DB::table('volunteer_church_pipelines')
                ->where('church_id', $churchId)
                ->whereNull('admin_workflow_stage_id')
                ->whereIn('stage_id', $macroStageIds)
                ->update([
                    'admin_workflow_stage_id' => DB::raw('stage_id'),
                    'updated_at' => now(),
                ]);

            if (! Schema::hasTable('volunteer_ministry_invitations')) {
                continue;
            }

            $encaminhadoStageId = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->value('id');

            if ($encaminhadoStageId === null) {
                continue;
            }

            $volunteerIds = DB::table('volunteer_ministry_invitations')
                ->where('church_id', $churchId)
                ->distinct()
                ->pluck('volunteer_id');

            if ($volunteerIds->isEmpty()) {
                continue;
            }

            foreach ($volunteerIds->chunk(500) as $chunkIds) {
                DB::table('volunteer_church_pipelines')
                    ->where('church_id', $churchId)
                    ->whereIn('volunteer_id', $chunkIds->values()->all())
                    ->whereNull('admin_workflow_stage_id')
                    ->update([
                        'admin_workflow_stage_id' => (int) $encaminhadoStageId,
                        'updated_at' => now(),
                    ]);

                $stageIdsToAlign = DB::table('volunteer_pipeline_stages')
                    ->where('church_id', $churchId)
                    ->where(function ($q): void {
                        $q->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
                            ->orWhereRaw('LOWER(TRIM(name)) = ?', ['em treinamento']);
                    })
                    ->pluck('id');

                if ($stageIdsToAlign->isNotEmpty()) {
                    DB::table('volunteer_church_pipelines')
                        ->where('church_id', $churchId)
                        ->whereIn('volunteer_id', $chunkIds->values()->all())
                        ->whereIn('stage_id', $stageIdsToAlign->values()->all())
                        ->update([
                            'stage_id' => (int) $encaminhadoStageId,
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Sem rollback automático do backfill para evitar regressão de dados.
    }
};
