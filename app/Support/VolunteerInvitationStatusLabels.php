<?php

namespace App\Support;

use App\Models\VolunteerMinistryInvitation;

final class VolunteerInvitationStatusLabels
{
    /**
     * Status do convite na visão do líder (resposta do voluntário ao departamento).
     */
    public static function forInvitation(?VolunteerMinistryInvitation $invitation): string
    {
        if ($invitation === null) {
            return 'Ativo na escala';
        }

        return self::forValues(
            (string) $invitation->status,
            $invitation->sent_at !== null,
            $invitation->volunteer?->user_id !== null,
        );
    }

    public static function forValues(string $status, bool $sent, bool $hasLinkedUser): string
    {
        return match ($status) {
            'accepted' => 'Aceito',
            'declined' => 'Recusado pelo voluntário',
            'pending' => $sent
                ? ($hasLinkedUser ? 'Aguardando resposta' : 'Aguardando cadastro')
                : 'Convite não enviado',
            default => $status !== '' ? $status : '—',
        };
    }
}
