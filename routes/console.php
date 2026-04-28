<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use App\Models\AppVersion;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:release', function () {
    if (! Schema::hasTable('app_versions')) {
        $this->error('Tabela app_versions não existe. Rode as migrations primeiro.');
        return 1;
    }

    /** @var string|null $version */
    $version = $this->option('version') ?: env('APP_RELEASE_VERSION');
    $version = is_string($version) ? trim($version) : null;
    if (! $version) {
        $this->error('Informe --version ou defina APP_RELEASE_VERSION no ambiente.');
        return 1;
    }

    $notes = $this->option('notes');
    $notes = is_string($notes) ? trim($notes) : null;
    $releasedAtRaw = $this->option('released_at');
    $releasedAtRaw = is_string($releasedAtRaw) ? trim($releasedAtRaw) : null;
    $releasedAt = $releasedAtRaw ? Carbon::parse($releasedAtRaw) : now();

    $row = AppVersion::query()->where('version', $version)->first();
    if (! $row) {
        AppVersion::create([
            'version' => $version,
            'released_at' => $releasedAt,
            'notes' => $notes ?: null,
        ]);
        $this->info("Versão criada: {$version}");
        return 0;
    }

    // Idempotente: se já existe, só atualiza metadados quando fizer sentido.
    $payload = [];
    if ($row->released_at === null || $row->released_at->lt($releasedAt)) {
        $payload['released_at'] = $releasedAt;
    }
    if ($notes && (! $row->notes || trim((string) $row->notes) === '')) {
        $payload['notes'] = $notes;
    }
    if ($payload) {
        $row->update($payload);
        $this->info("Versão atualizada: {$version}");
        return 0;
    }

    $this->info("Versão já registrada: {$version}");
    return 0;
})
    ->purpose('Registra uma versão (deploy) em app_versions')
    ->addOption('version', null, \Symfony\Component\Console\Input\InputOption::VALUE_REQUIRED, 'Label da versão (ex.: 2026.04.28-a1b2c3d)')
    ->addOption('released_at', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Data/hora de lançamento (ISO8601)')
    ->addOption('notes', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Notas da versão');

Schedule::command('auth:prune-login-events')->weekly();
