<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('weekly_programs')) {
            return;
        }

        $now = now();

        DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where(function ($q) {
                $q->where('title', 'Primeiro Culto')
                    ->orWhere(function ($q2) {
                        $q2->where('title', 'CULTO')->where('start_time', '09:30:00');
                    })
                    ->orWhere(function ($q2) {
                        $q2->where('when_label', 'SÁB 9H30')->where('title', 'like', '%Culto%');
                    });
            })
            ->update([
                'title' => '1º CULTO',
                'updated_at' => $now,
            ]);

        DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where(function ($q) {
                $q->where('title', 'Segundo Culto')
                    ->orWhere(function ($q2) {
                        $q2->where('title', 'CULTO')->where('start_time', '12:00:00');
                    })
                    ->orWhere(function ($q2) {
                        $q2->where('when_label', 'SÁB 12H')->where('title', 'like', '%Culto%');
                    });
            })
            ->update([
                'title' => '2º CULTO',
                'updated_at' => $now,
            ]);

        DB::table('weekly_programs')
            ->where(function ($q) {
                $q->where('title', 'Estudo')
                    ->orWhere('title', 'estudo')
                    ->orWhere(function ($q2) {
                        $q2->where('when_label', 'SÁB 11H');
                    });
            })
            ->update([
                'title' => 'ESTUDO',
                'updated_at' => $now,
            ]);

        // Demais títulos em maiúsculas.
        $rows = DB::table('weekly_programs')->whereNotNull('title')->get(['id', 'title']);
        foreach ($rows as $row) {
            $title = trim((string) $row->title);
            if ($title === '') {
                continue;
            }
            $upper = mb_strtoupper($title, 'UTF-8');
            if ($upper !== $title) {
                DB::table('weekly_programs')->where('id', $row->id)->update([
                    'title' => $upper,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        //
    }
};
