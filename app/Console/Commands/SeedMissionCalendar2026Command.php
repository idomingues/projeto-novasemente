<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\MissionEvent;
use App\Support\MissionCalendar2026Installer;
use App\Support\NovaSementeMissionCalendar2026;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'mission:seed-calendar-2026',
    description: 'Instala o calendário da Missão (jun–dez/2026) em Missão → Eventos',
)]
class SeedMissionCalendar2026Command extends Command
{
    protected $signature = 'mission:seed-calendar-2026
                            {--church=nova-semente : Slug da igreja (padrão: nova-semente)}';

    public function handle(): int
    {
        $church = Church::query()->where('slug', $this->option('church'))->first()
            ?? Church::query()->where('active', true)->orderBy('id')->first();

        if ($church === null) {
            $this->error('Nenhuma igreja encontrada. Rode as migrações e o ChurchSeeder antes.');

            return self::FAILURE;
        }

        $result = MissionCalendar2026Installer::install((int) $church->id);
        $total = count(NovaSementeMissionCalendar2026::events());
        $inMission = MissionEvent::query()
            ->where('church_id', $church->id)
            ->missionCalendar2026()
            ->count();

        $this->info("Calendário Missão 2026 — igreja: {$church->name}");
        $this->line("  Novos: {$result['created']} · Atualizados: {$result['updated']} · Total no pacote: {$total}");
        $this->line("  Eventos em mission_events (jun–dez/2026): {$inMission}");

        if ($result['removed_from_events'] > 0) {
            $this->line("  Removidos de Eventos gerais (duplicatas): {$result['removed_from_events']}");
        }

        $this->newLine();
        $this->comment('App: Mais → Missão → Próximos eventos');
        $this->comment('Admin: Missão → gestão → Eventos');

        return self::SUCCESS;
    }
}
