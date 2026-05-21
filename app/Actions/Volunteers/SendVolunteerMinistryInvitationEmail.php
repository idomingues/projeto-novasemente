<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerMinistryInvitation;

/**
 * Envia o e-mail do convite de ministério para o endereço do voluntário ou do usuário vinculado.
 */
final class SendVolunteerMinistryInvitationEmail
{
    public function __invoke(VolunteerMinistryInvitation $invitation): bool
    {
        return app(NotifyVolunteerMinistryInvitation::class)($invitation, ['email']);
    }
}
