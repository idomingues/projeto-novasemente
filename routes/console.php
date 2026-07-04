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
    $notesFile = $this->option('notes-file');
    $notesFile = is_string($notesFile) ? trim($notesFile) : null;
    if ($notesFile !== null && $notesFile !== '') {
        if (! is_file($notesFile)) {
            $this->error("Arquivo de notas não encontrado: {$notesFile}");
            return 1;
        }
        $notes = trim((string) file_get_contents($notesFile));
    }
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
    if ($notes) {
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
    ->addOption('notes', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Notas da versão')
    ->addOption('notes-file', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Arquivo com notas (ex.: deployment/release-notes.txt)');

Artisan::command('app:release-notes', function () {
    if (! Schema::hasTable('app_versions')) {
        $this->error('Tabela app_versions não existe. Rode as migrations primeiro.');
        return 1;
    }

    $file = $this->option('file') ?: base_path('deployment/release-notes.txt');
    if (! is_file($file)) {
        $this->error("Arquivo de notas não encontrado: {$file}");
        return 1;
    }

    $notes = trim((string) file_get_contents($file));
    if ($notes === '') {
        $this->error('Arquivo de notas está vazio.');
        return 1;
    }

    $version = $this->option('for-version');
    $version = is_string($version) ? trim($version) : null;

    $row = $version
        ? AppVersion::query()->where('version', $version)->first()
        : AppVersion::query()->orderByDesc('released_at')->orderByDesc('id')->first();

    if (! $row) {
        $this->error($version ? "Versão não encontrada: {$version}" : 'Nenhuma versão cadastrada.');
        return 1;
    }

    $row->update(['notes' => $notes]);
    $this->info("Notas atualizadas para v{$row->version}.");

    return 0;
})
    ->purpose('Atualiza o descritivo (notas) de uma versão a partir de deployment/release-notes.txt')
    ->addOption('for-version', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Versão alvo (padrão: a mais recente)')
    ->addOption('file', null, \Symfony\Component\Console\Input\InputOption::VALUE_OPTIONAL, 'Caminho do arquivo de notas');

Schedule::command('auth:prune-login-events')->weekly();
Schedule::command('revista-adventista:sync-archive --cache-pdfs')->dailyAt('03:00');
Schedule::command('revista-adventista:sync')->weekly();
