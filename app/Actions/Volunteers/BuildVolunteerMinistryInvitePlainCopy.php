<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerMinistryInvitation;

/**
 * Texto plano do convite: saudação, texto introdutório e link de cadastro (quando aplicável).
 * É o mesmo conteúdo usado no WhatsApp e passa a ser o corpo principal do e-mail.
 */
final class BuildVolunteerMinistryInvitePlainCopy
{
    public static function registerUrlFor(VolunteerMinistryInvitation $invitation): ?string
    {
        $invitation->loadMissing(['volunteer']);

        $v = $invitation->volunteer;
        $em = trim((string) ($v?->email ?? ''));
        if ($em === '' || $v?->user_id !== null || $invitation->status !== 'pending' || $invitation->isExpired()) {
            return null;
        }

        return route('register', [
            'ministry_invite_token' => $invitation->token,
            'email' => $em,
        ], true);
    }

    public static function for(VolunteerMinistryInvitation $invitation): string
    {
        $invitation->loadMissing(['volunteer', 'ministry', 'church']);

        $name = trim((string) ($invitation->volunteer?->name ?? ''));
        $greeting = $name !== '' ? "Olá, {$name}!" : 'Olá!';
        $ministry = trim((string) ($invitation->ministry?->name ?? '')) ?: 'Departamento';

        $intro = $invitation->resolvedIntroParagraph();

        $lines = [
            $greeting,
            '',
            $intro,
        ];

        $registerUrl = self::registerUrlFor($invitation);
        if ($registerUrl !== null) {
            $lines[] = '';
            $lines[] = "Para confirmar o convite para «{$ministry}», crie sua conta no aplicativo (o e-mail já vem preenchido):";
            $lines[] = $registerUrl;
        }

        $em = trim((string) ($invitation->volunteer?->email ?? ''));
        if ($em !== '' && $registerUrl !== null) {
            $lines[] = '';
            $lines[] = 'Se criar a conta por outro caminho, use exatamente este e-mail: '.$em.'.';
        }

        return implode("\n", $lines);
    }
}
