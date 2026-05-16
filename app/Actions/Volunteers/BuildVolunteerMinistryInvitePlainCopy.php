<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerMinistryInvitation;

/**
 * Texto plano do convite: saudação, texto introdutório, links público e de registo (quando aplicável).
 * É o mesmo conteúdo usado no WhatsApp e passa a ser o corpo principal do e-mail.
 */
final class BuildVolunteerMinistryInvitePlainCopy
{
    public static function for(VolunteerMinistryInvitation $invitation): string
    {
        $invitation->loadMissing(['volunteer', 'ministry', 'church']);

        $name = trim((string) ($invitation->volunteer?->name ?? ''));
        $greeting = $name !== '' ? "Olá, {$name}!" : 'Olá!';
        $ministry = trim((string) ($invitation->ministry?->name ?? '')) ?: 'Departamento';

        $intro = $invitation->resolvedIntroParagraph();

        $publicUrl = route('volunteers.ministry-invite.show', ['token' => $invitation->token], true);

        $lines = [
            $greeting,
            '',
            $intro,
            '',
            "Para aceitar ou recusar o convite para «{$ministry}», abra este link:",
            $publicUrl,
        ];

        $v = $invitation->volunteer;
        $em = trim((string) ($v?->email ?? ''));
        if ($em !== '' && $v?->user_id === null && $invitation->status === 'pending' && ! $invitation->isExpired()) {
            $reg = route('register', [
                'ministry_invite_token' => $invitation->token,
                'email' => $em,
            ], true);
            $lines[] = '';
            $lines[] = 'Para criar a sua conta no app e aceitar o convite de uma vez (recomendado), use este link — o e-mail já vem no endereço:';
            $lines[] = $reg;
        }

        if ($em !== '') {
            $lines[] = '';
            $lines[] = 'Se fizer o cadastro por outro caminho (sem estes links), tem de usar exatamente o mesmo e-mail do cadastro de voluntário: '.$em.'.';
        }

        return implode("\n", $lines);
    }
}
