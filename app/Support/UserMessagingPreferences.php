<?php

namespace App\Support;

use App\Models\User;

/**
 * Preferências de contacto do utilizador (cadastro e perfil).
 * Usar antes de criar {@see \App\Models\UserInboxNotification} ou enviar e-mail informativo à conta.
 *
 * WhatsApp: ainda não há envio automático; o método serve para futuras integrações
 * (ex.: lembrar quando `Volunteer::has_whatsapp` e número existirem).
 */
final class UserMessagingPreferences
{
    public static function acceptsInbox(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return (bool) $user->notify_via_app;
    }

    public static function acceptsAccountEmail(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return (bool) $user->notify_via_email;
    }

    public static function acceptsWhatsappInfo(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return (bool) $user->notify_via_whatsapp;
    }

    /**
     * E-mail associado a um voluntário: se tiver conta, aplicam-se as preferências da conta.
     */
    public static function acceptsEmailForVolunteerContact(\App\Models\Volunteer $volunteer): bool
    {
        if ($volunteer->user_id) {
            $user = User::query()->find($volunteer->user_id);

            return $user ? self::acceptsAccountEmail($user) : true;
        }

        return true;
    }
}
