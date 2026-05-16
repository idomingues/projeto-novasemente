<?php

namespace App\Actions\Volunteers;

use App\Mail\VolunteerMinistryInvitationMail;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Support\Facades\Mail;

/**
 * Envia o e-mail do convite público (aceitar/recusar ministério) para o endereço do voluntário ou do utilizador ligado.
 */
final class SendVolunteerMinistryInvitationEmail
{
    public function __invoke(VolunteerMinistryInvitation $invitation): bool
    {
        $invitation->loadMissing(['volunteer.user', 'ministry', 'slots', 'church']);

        $to = trim((string) ($invitation->volunteer?->email ?? ''));
        if ($to === '' && $invitation->volunteer?->user) {
            $to = trim((string) ($invitation->volunteer->user->email ?? ''));
        }
        if ($to === '') {
            return false;
        }

        $inviteUrl = route('volunteers.ministry-invite.show', ['token' => $invitation->token], true);
        Mail::to($to)->send(new VolunteerMinistryInvitationMail($invitation, $inviteUrl));

        if ($invitation->sent_at === null) {
            $invitation->forceFill(['sent_at' => now(), 'channel' => 'email'])->save();
        }

        return true;
    }
}
