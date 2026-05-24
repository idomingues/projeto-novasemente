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
                ->whereRaw('LOWER(TRIM(name)) = ?', ['em análise'])
                ->exists();

            if ($exists) {
                continue;
            }

            $interessadoSort = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
                ->orderBy('sort_order')
                ->value('sort_order');

            $encaminhadoSort = DB::table('volunteer_pipeline_stages')
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
                ->orderBy('sort_order')
                ->value('sort_order');

            if ($interessadoSort !== null && $encaminhadoSort !== null) {
                $sortOrder = (int) floor(((int) $interessadoSort + (int) $encaminhadoSort) / 2);
                if ($sortOrder <= (int) $interessadoSort) {
                    $sortOrder = (int) $interessadoSort + 1;
                }
            } elseif ($encaminhadoSort !== null) {
                $sortOrder = max(0, (int) $encaminhadoSort - 1);
            } elseif ($interessadoSort !== null) {
                $sortOrder = (int) $interessadoSort + 2;
            } else {
                $sortOrder = 12;
            }

            DB::table('volunteer_pipeline_stages')->insert([
                'church_id' => $churchId,
                'name' => 'Em análise',
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
            ->whereRaw('LOWER(TRIM(name)) = ?', ['em análise'])
            ->delete();
    }
};
