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

        $stages = [
            ['name' => 'Recusado pelo voluntário', 'needle' => 'recusado pelo voluntário', 'sort_order' => 16],
            ['name' => 'Recusado pelo líder', 'needle' => 'recusado pelo líder', 'sort_order' => 17],
        ];

        foreach ($churchIds as $churchId) {
            foreach ($stages as $row) {
                $exists = DB::table('volunteer_pipeline_stages')
                    ->where('church_id', $churchId)
                    ->whereRaw('LOWER(TRIM(name)) = ?', [$row['needle']])
                    ->exists();

                if ($exists) {
                    continue;
                }

                DB::table('volunteer_pipeline_stages')->insert([
                    'church_id' => $churchId,
                    'name' => $row['name'],
                    'sort_order' => $row['sort_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if (! Schema::hasTable('volunteer_church_pipelines') || ! Schema::hasTable('volunteer_ministry_invitations')) {
            return;
        }

        foreach ($churchIds as $churchId) {
            $voluntarioStageId = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['recusado pelo voluntário'])
                ->value('id');

            $liderStageId = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['recusado pelo líder'])
                ->value('id');

            if ($voluntarioStageId) {
                $volunteerIds = DB::table('volunteer_ministry_invitations')
                    ->where('church_id', $churchId)
                    ->where('status', 'declined')
                    ->distinct()
                    ->pluck('volunteer_id');

                foreach ($volunteerIds->chunk(500) as $chunk) {
                    DB::table('volunteer_church_pipelines')
                        ->where('church_id', $churchId)
                        ->whereIn('volunteer_id', $chunk->values()->all())
                        ->update([
                            'stage_id' => (int) $voluntarioStageId,
                            'updated_at' => now(),
                        ]);
                }
            }

            if ($liderStageId) {
                $volunteerIds = DB::table('volunteer_ministry_invitations')
                    ->where('church_id', $churchId)
                    ->where('leader_status', 'denied')
                    ->distinct()
                    ->pluck('volunteer_id');

                foreach ($volunteerIds->chunk(500) as $chunk) {
                    DB::table('volunteer_church_pipelines')
                        ->where('church_id', $churchId)
                        ->whereIn('volunteer_id', $chunk->values()->all())
                        ->update([
                            'stage_id' => (int) $liderStageId,
                            'updated_at' => now(),
                        ]);
                }
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        DB::table('volunteer_pipeline_stages')
            ->whereRaw('LOWER(TRIM(name)) IN (?, ?)', ['recusado pelo voluntário', 'recusado pelo líder'])
            ->delete();
    }
};
