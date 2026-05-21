<?php

namespace App\Support;

final class VolunteerLeaderStatusLabels
{
    public static function label(?string $status): string
    {
        return match ($status) {
            'denied' => 'Recusado',
            'training' => 'Em treinamento',
            'ready' => 'Pronto para servir',
            'active' => 'Atuante',
            default => '—',
        };
    }
}
