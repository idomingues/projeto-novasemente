<?php

namespace App\Actions\Mission;

use App\Mail\MissionVolunteerInviteMail;
use App\Models\MissionVolunteer;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

final class SendMissionVolunteerInvite
{
    public function __construct(
        private readonly CreateMissionVolunteerInvite $createInvite,
    ) {}

    /**
     * @return array{link: string, email_sent: bool}
     */
    public function __invoke(MissionVolunteer $volunteer, ?User $invitedBy): array
    {
        $created = ($this->createInvite)($volunteer, $invitedBy);
        $invitation = $created['invitation'];
        $link = $created['link'];
        $emailSent = false;

        $to = $volunteer->display_email;
        if ($to !== null) {
            $invitation->forceFill(['channel' => 'email'])->save();
            $invitation->loadMissing(['volunteer.church', 'invitedBy']);
            Mail::to($to)->send(new MissionVolunteerInviteMail($invitation, $link));
            $emailSent = true;
        }

        $volunteer->forceFill(['last_invite_sent_at' => now()])->save();

        return [
            'link' => $link,
            'email_sent' => $emailSent,
        ];
    }
}
