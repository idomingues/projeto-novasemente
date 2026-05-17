<?php

namespace App\Actions\Volunteers;

use App\Mail\VolunteerMinistryInvitationMail;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Support\Facades\Mail;

/**
 * Envia o e-mail do convite de ministério para o endereço do voluntário ou do usuário vinculado.
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

        Mail::to($to)->send(new VolunteerMinistryInvitationMail($invitation));

        if ($invitation->sent_at === null) {
            $invitation->forceFill(['sent_at' => now(), 'channel' => 'email'])->save();
        }

        return true;
    }
}
