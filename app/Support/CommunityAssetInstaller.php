<?php

namespace App\Support;

use App\Models\Church;
use App\Models\ChurchCommunity;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

final class CommunityAssetInstaller
{
    public const SEVEN_BIKE_NAME = 'Seven Bike Nova Semente';

    public const SEVEN_BIKE_COVER_PATH = 'communities/covers/seven-bike-nova-semente.jpg';

    public const SEVEN_BIKE_WHATSAPP = 'https://chat.whatsapp.com/HHy3EffBYja69JibdgRVhC';

    /**
     * @return array{ok: bool, message: string, cover_path: ?string, community_id: ?int}
     */
    public static function installSevenBike(?int $churchId = null): array
    {
        if (! Schema::hasTable('church_communities')) {
            return [
                'ok' => false,
                'message' => 'Tabela church_communities não existe. Rode php artisan migrate.',
                'cover_path' => null,
                'community_id' => null,
            ];
        }

        $churchId ??= Church::query()->where('active', true)->orderBy('id')->value('id')
            ?? Church::query()->orderBy('id')->value('id');

        if ($churchId === null) {
            return [
                'ok' => false,
                'message' => 'Nenhuma igreja cadastrada.',
                'cover_path' => null,
                'community_id' => null,
            ];
        }

        $coverPath = self::ensureCoverFile();
        if ($coverPath === null) {
            return [
                'ok' => false,
                'message' => 'Arte não encontrada em database/seed-assets/communities/seven-bike-nova-semente.jpg',
                'cover_path' => null,
                'community_id' => null,
            ];
        }

        $community = ChurchCommunity::firstOrCreate(
            [
                'church_id' => $churchId,
                'name' => self::SEVEN_BIKE_NAME,
            ],
            [
                'description' => 'Comunidade de ciclismo da Nova Semente — pedaladas, eventos e convivência no WhatsApp.',
                'whatsapp_url' => self::SEVEN_BIKE_WHATSAPP,
                'sort_order' => 10,
                'is_published' => true,
                'cover_path' => $coverPath,
            ],
        );

        $needsUpdate = $community->cover_path !== $coverPath
            || ! $community->is_published
            || $community->whatsapp_url !== self::SEVEN_BIKE_WHATSAPP;

        if ($needsUpdate) {
            $community->update([
                'cover_path' => $coverPath,
                'is_published' => true,
                'whatsapp_url' => self::SEVEN_BIKE_WHATSAPP,
            ]);
        }

        $fileOk = Storage::disk('public')->exists($coverPath);

        return [
            'ok' => $fileOk,
            'message' => $fileOk
                ? 'Seven Bike instalado com sucesso.'
                : 'Comunidade salva, mas o arquivo da capa não está no storage.',
            'cover_path' => $coverPath,
            'community_id' => $community->id,
        ];
    }

    public static function ensureCoverFile(): ?string
    {
        $relativePath = self::SEVEN_BIKE_COVER_PATH;
        $source = database_path('seed-assets/communities/seven-bike-nova-semente.jpg');

        if (! is_file($source)) {
            return Storage::disk('public')->exists($relativePath) ? $relativePath : null;
        }

        Storage::disk('public')->makeDirectory('communities/covers');
        $target = Storage::disk('public')->path($relativePath);

        // Sempre sincroniza a arte do seed (permite atualizar layout vertical em produção).
        if (is_file($source)) {
            File::copy($source, $target);
        } elseif (! is_file($target)) {
            return null;
        }

        return is_file($target) && filesize($target) > 0 ? $relativePath : null;
    }
}
