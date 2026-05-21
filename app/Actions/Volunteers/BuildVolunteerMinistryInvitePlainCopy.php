<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerMinistryInvitation;

/**
 * Texto plano do convite: saudação, texto introdutório e link (cadastro ou página do convite).
 * É o mesmo conteúdo usado no WhatsApp e passa a ser o corpo principal do e-mail.
 */
final class BuildVolunteerMinistryInvitePlainCopy
{
    public const APP_WEB_URL = 'https://app.novasemente.com.br';

    public static function hasLinkedAppAccount(VolunteerMinistryInvitation $invitation): bool
    {
        $invitation->loadMissing(['volunteer']);

        return $invitation->volunteer?->user_id !== null;
    }

    public static function inviteUrlFor(VolunteerMinistryInvitation $invitation): string
    {
        return route('volunteers.ministry-invite.show', ['token' => $invitation->token], true);
    }

    public static function appHomeUrlFor(VolunteerMinistryInvitation $invitation): string
    {
        return route('mobile.home', [], true);
    }

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

        $hasLinkedAccount = self::hasLinkedAppAccount($invitation);
        $registerUrl = self::registerUrlFor($invitation);
        $inviteUrl = self::inviteUrlFor($invitation);

        if ($hasLinkedAccount) {
            $lines[] = '';
            $lines[] = 'Para aceitar ou recusar o convite, acesse o link abaixo (faça login com sua conta no app):';
            $lines[] = $inviteUrl;
        } elseif ($registerUrl !== null) {
            $lines[] = '';
            $lines[] = "Para aceitar o convite para «{$ministry}», crie sua conta no aplicativo (o e-mail já vem preenchido):";
            $lines[] = $registerUrl;

            $em = trim((string) ($invitation->volunteer?->email ?? ''));
            if ($em !== '') {
                $lines[] = '';
                $lines[] = 'Se criar a conta por outro caminho, use exatamente este e-mail: '.$em.'.';
            }
        }

        return implode("\n", $lines);
    }
}
