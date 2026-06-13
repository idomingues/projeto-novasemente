<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Support\MissionCalendar2026Installer;
use App\Support\NovaSementeMissionCalendar2026;
use Illuminate\Database\Seeder;

/**
 * Eventos da Missão (jun–dez/2026) — gestão em Missão → Eventos.
 *
 * Preferir: php artisan mission:seed-calendar-2026
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

        $result = MissionCalendar2026Installer::install($churchId);

        $this->command?->info(sprintf(
            'Eventos da Missão 2026: %d no pacote (%d novos, %d atualizados).',
            count(NovaSementeMissionCalendar2026::events()),
            $result['created'],
            $result['updated'],
        ));
    }
}
