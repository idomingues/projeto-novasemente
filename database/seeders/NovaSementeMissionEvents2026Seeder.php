<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\Event;
use App\Models\MissionEvent;
use App\Support\NovaSementeMissionCalendar2026;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Eventos da Missão (jun–dez/2026) — gestão em Missão → Eventos.
 *
 * Executar: php artisan db:seed --class=NovaSementeMissionEvents2026Seeder
 */
class NovaSementeMissionEvents2026Seeder extends Seeder
{
    public function run(): void
    {
        $churchId = (int) Church::query()->orderBy('id')->value('id');
        if ($churchId <= 0) {
            $this->command?->warn('Nenhuma igreja encontrada. Execute ChurchSeeder antes.');

            return;
        }

        $timezone = (string) config('app.timezone');
        $rows = NovaSementeMissionCalendar2026::events();

        foreach ($rows as $row) {
            $startsAt = Carbon::parse($row['starts_at'].' 00:00:00', $timezone);
            $endsAt = isset($row['ends_at'])
                ? Carbon::parse($row['ends_at'].' 23:59:59', $timezone)
                : null;

            MissionEvent::query()->updateOrCreate(
                [
                    'church_id' => $churchId,
                    'title' => $row['title'],
                    'starts_at' => $startsAt,
                ],
                [
                    'description' => $row['description'] ?? null,
                    'ends_at' => $endsAt,
                    'all_day' => true,
                    'location' => $row['location'] ?? null,
                ],
            );

            Event::query()
                ->where('church_id', $churchId)
                ->where('title', $row['title'])
                ->whereDate('starts_at', $startsAt->toDateString())
                ->delete();
        }

        $this->command?->info('Eventos da Missão 2026 cadastrados/atualizados: '.count($rows));
    }
}
