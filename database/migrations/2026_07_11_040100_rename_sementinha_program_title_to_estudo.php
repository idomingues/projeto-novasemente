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

        // Item das 11h (Escola Sabatina / faixas etárias): título deve ser "Estudo".
        DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where(function ($q) {
                $q->where('when_label', 'SÁB 11H')
                    ->orWhere('when_label', 'like', '%11H%')
                    ->orWhere('start_time', '11:00:00')
                    ->orWhere('start_time', '11:00');
            })
            ->update([
                'title' => 'ESTUDO',
                'when_label' => 'SÁB 11H',
                'display_time' => '11:00',
                'updated_at' => $now,
            ]);

        // Qualquer item cuja primeira linha ainda esteja sendo usada como título implícito.
        $rows = DB::table('weekly_programs')
            ->whereNotNull('lines')
            ->get(['id', 'title', 'lines']);

        foreach ($rows as $row) {
            $lines = json_decode((string) $row->lines, true);
            if (! is_array($lines) || $lines === []) {
                continue;
            }
            $first = trim((string) ($lines[0] ?? ''));
            if ($first === '' || stripos($first, 'SEMENTINHA') === false) {
                continue;
            }
            if (trim((string) ($row->title ?? '')) !== '' && strcasecmp((string) $row->title, 'ESTUDO') === 0) {
                continue;
            }
            DB::table('weekly_programs')->where('id', $row->id)->update([
                'title' => 'ESTUDO',
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        //
    }
};
