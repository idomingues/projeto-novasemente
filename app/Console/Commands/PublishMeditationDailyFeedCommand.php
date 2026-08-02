<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Services\MeditationDailyFeedPublisher;
use Carbon\Carbon;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'app:publish-meditation-daily-feed',
    description: 'Publica o feed Meditação diária do dia (capa Unsplash + versículo CPB)',
)]
class PublishMeditationDailyFeedCommand extends Command
{
    protected $signature = 'app:publish-meditation-daily-feed
                            {--date= : Data Y-m-d (padrão: hoje no fuso do app)}
                            {--church= : Slug ou ID (padrão: todas as igrejas ativas com meditação)}
                            {--force : Atualiza se o feed do dia já existir}';

    public function handle(MeditationDailyFeedPublisher $publisher): int
    {
        $tz = (string) config('app.timezone');
        $dateRaw = trim((string) $this->option('date'));
        try {
            $date = $dateRaw !== ''
                ? Carbon::parse($dateRaw, $tz)->startOfDay()
                : now($tz)->startOfDay();
        } catch (\Throwable) {
            $this->error('Data inválida. Use Y-m-d.');

            return self::FAILURE;
        }

        $onlyChurch = null;
        $churchOpt = trim((string) $this->option('church'));
        if ($churchOpt !== '') {
            $onlyChurch = ctype_digit($churchOpt)
                ? Church::query()->find((int) $churchOpt)
                : Church::query()->where('slug', $churchOpt)->first();
            if ($onlyChurch === null) {
                $this->error("Igreja não encontrada: {$churchOpt}");

                return self::FAILURE;
            }
        }

        $force = (bool) $this->option('force');
        $this->info('Publicando Meditação diária · '.$date->toDateString().($force ? ' (force)' : ''));

        $stats = $publisher->publishForDate($date, $force, $onlyChurch);

        foreach ($stats['lines'] as $line) {
            $this->line('· '.$line);
        }

        $this->newLine();
        $this->info("Criados: {$stats['created']} · Atualizados: {$stats['updated']} · Ignorados: {$stats['skipped']} · Falhas: {$stats['failed']}");

        return $stats['failed'] > 0 && ($stats['created'] + $stats['updated']) === 0
            ? self::FAILURE
            : self::SUCCESS;
    }
}
