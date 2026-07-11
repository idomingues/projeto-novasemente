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

        $combined = DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where(function ($q) {
                $q->where('when_label', 'like', '%9H30%e%12%')
                    ->orWhere('when_label', 'like', '%9h30%e%12%')
                    ->orWhere('display_time', 'like', '%9h30%/%12%')
                    ->orWhere('display_time', 'like', '%9H30%/%12%')
                    ->orWhere('display_time', 'like', '%09:30%/%12%');
            })
            ->get();

        foreach ($combined as $row) {
            DB::table('weekly_programs')->where('id', $row->id)->update([
                'when_label' => 'SÁB 9H30',
                'title' => '1º CULTO',
                'start_time' => '09:30:00',
                'display_time' => '09:30',
                'sort_order' => min((int) $row->sort_order, 30),
                'updated_at' => $now,
            ]);

            $hasSecond = DB::table('weekly_programs')
                ->where('church_id', $row->church_id)
                ->where('day_of_week', 6)
                ->where(function ($q) {
                    $q->where('start_time', '12:00:00')
                        ->orWhere('when_label', 'SÁB 12H')
                        ->orWhere('title', '2º CULTO')
                        ->orWhere('title', 'Segundo Culto');
                })
                ->exists();

            if (! $hasSecond) {
                DB::table('weekly_programs')->insert([
                    'church_id' => $row->church_id,
                    'day_of_week' => 6,
                    'when_label' => 'SÁB 12H',
                    'title' => '2º CULTO',
                    'body' => $row->body,
                    'lines' => null,
                    'time_mode' => 'fixed',
                    'start_time' => '12:00:00',
                    'end_time' => null,
                    'display_time' => '12:00',
                    'home_message' => $row->home_message,
                    'image_url' => null,
                    'show_on_home' => (bool) $row->show_on_home,
                    'is_active' => (bool) $row->is_active,
                    'sort_order' => 45,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // Ambientes em que já existem dois CULTO sem o nome novo.
        DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where('title', 'CULTO')
            ->where('start_time', '09:30:00')
            ->update([
                'title' => '1º CULTO',
                'when_label' => 'SÁB 9H30',
                'display_time' => '09:30',
                'updated_at' => $now,
            ]);

        DB::table('weekly_programs')
            ->where('day_of_week', 6)
            ->where('title', 'CULTO')
            ->where('start_time', '12:00:00')
            ->update([
                'title' => '2º CULTO',
                'when_label' => 'SÁB 12H',
                'display_time' => '12:00',
                'updated_at' => $now,
            ]);
    }

    public function down(): void
    {
        // Dados de conteúdo — sem rollback automático.
    }
};
