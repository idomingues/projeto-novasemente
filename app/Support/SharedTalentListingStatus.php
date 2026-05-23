<?php

namespace App\Support;

use App\Models\SharedTalentListing;

final class SharedTalentListingStatus
{
    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            SharedTalentListing::STATUS_PENDING => 'Em análise',
            SharedTalentListing::STATUS_APPROVED => 'Aprovado',
            SharedTalentListing::STATUS_REJECTED => 'Rejeitado',
            SharedTalentListing::STATUS_ACTIVE => 'Ativo',
            SharedTalentListing::STATUS_PAUSED => 'Pausado',
            SharedTalentListing::STATUS_CLOSED => 'Encerrado',
            SharedTalentListing::STATUS_FULL => 'Lotado',
        ];
    }

    public static function label(string $status): string
    {
        return self::labels()[$status] ?? $status;
    }

    public static function isCatalogVisible(string $status): bool
    {
        return in_array($status, [
            SharedTalentListing::STATUS_ACTIVE,
            SharedTalentListing::STATUS_FULL,
        ], true);
    }

    /** @return list<string> */
    public static function catalogStatuses(): array
    {
        return [
            SharedTalentListing::STATUS_ACTIVE,
            SharedTalentListing::STATUS_FULL,
        ];
    }

    /** @return array<string, string> */
    public static function adminTabLabels(): array
    {
        return [
            SharedTalentListing::STATUS_PENDING => 'Em análise',
            SharedTalentListing::STATUS_ACTIVE => 'Ativos',
            SharedTalentListing::STATUS_REJECTED => 'Rejeitados',
            'all' => 'Todas',
        ];
    }

    /** @return list<array{value: string, label: string}> */
    public static function ownerStatusOptions(): array
    {
        return [
            ['value' => SharedTalentListing::STATUS_PAUSED, 'label' => self::label(SharedTalentListing::STATUS_PAUSED)],
            ['value' => SharedTalentListing::STATUS_ACTIVE, 'label' => 'Reativar'],
            ['value' => SharedTalentListing::STATUS_CLOSED, 'label' => self::label(SharedTalentListing::STATUS_CLOSED)],
        ];
    }
}
