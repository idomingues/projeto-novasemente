<?php

namespace App\Support;

use App\Models\User;
use App\Models\UserInboxNotification;

/**
 * Notificações operacionais de liderança de ministério (NS Conecta, escalas, roster).
 * Admin/super_admin só recebe se também for líder (`is_ministry_leader`).
 */
final class LeaderOperationalNotifications
{
    /** @var list<string> */
    private const LEADER_TITLES = [
        'Nova conversa no NS Conecta',
        'Nova conversa no NS Whats',
        'NS Conecta',
        'Nova mensagem no NS Whats',
        'Nova mensagem no NS Conecta',
        'NS Whats — responsável atualizado',
        'NS Conecta — responsável atualizado',
        'Conversa transferida no NS Conecta',
        'Conversa transferida no NS Whats',
        'Nova conversa encaminhada',
        'Nova conversa na fila',
        'Novo voluntário no ministério',
        'Check-in realizado',
        'Check-in desfeito',
        'Novo pedido de conversa',
        'Nova mensagem do membro',
    ];

    public static function userShouldReceive(User $user): bool
    {
        return $user->isMinistryLeaderAccount();
    }

    public static function isLeaderOnlyInbox(UserInboxNotification $notification): bool
    {
        $title = trim((string) $notification->title);
        if ($title !== '' && in_array($title, self::LEADER_TITLES, true)) {
            return true;
        }

        $url = strtolower((string) ($notification->action_url ?? ''));
        if ($url === '') {
            return false;
        }

        return str_contains($url, '/ns-whats')
            || str_contains($url, 'ns-whats-lider')
            || str_contains($url, '/lideranca/')
            || str_contains($url, 'leader-solicitations')
            || str_contains($url, 'ministry-lead.');
    }

    /**
     * Admin (ou super admin) sem propriedade de líder não vê alertas de liderança no sino.
     */
    public static function shouldHideFromUser(?User $user, UserInboxNotification $notification): bool
    {
        if ($user === null || self::userShouldReceive($user)) {
            return false;
        }

        if (! $user->hasAnyRole(['admin', 'super_admin'])) {
            return false;
        }

        return self::isLeaderOnlyInbox($notification);
    }
}
