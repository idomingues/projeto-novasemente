<?php

namespace App\Console\Commands;

use App\Support\CommunityAssetInstaller;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class InstallCommunityDefaultsCommand extends Command
{
    protected $signature = 'communities:install-defaults {--church= : ID da igreja (opcional)}';

    protected $description = 'Instala comunidades padrão (Seven Bike) e copia a arte para o storage público.';

    public function handle(): int
    {
        $churchId = $this->option('church');
        $churchId = is_numeric($churchId) ? (int) $churchId : null;

        $result = CommunityAssetInstaller::installSevenBike($churchId);

        if ($result['community_id'] !== null) {
            $this->line('Comunidade ID: <fg=cyan>'.$result['community_id'].'</>');
        }

        if ($result['cover_path'] !== null) {
            $this->line('Capa: <fg=cyan>'.$result['cover_path'].'</>');
            $exists = Storage::disk('public')->exists($result['cover_path']);
            $this->line('Arquivo no storage: '.($exists ? '<fg=green>sim</>' : '<fg=red>não</>'));
            if ($exists) {
                $this->line('URL media: <fg=cyan>'.route('media.public', ['path' => $result['cover_path']]).'</>');
            }
        }

        if ($result['ok']) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        $this->error($result['message']);

        return self::FAILURE;
    }
}
