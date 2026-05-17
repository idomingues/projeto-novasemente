<?php

namespace App\Actions\Mission;

use App\Mail\MissionVolunteerInviteMail;
use App\Models\MissionInvitation;
use App\Models\MissionVolunteer;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

final class SendMissionVolunteerInvite
{
    public function __invoke(MissionVolunteer $volunteer, ?User $invitedBy): bool
    {
        $to = $volunteer->display_email;
        if ($to === null) {
            return false;
        }

        $invitation = MissionInvitation::create([
            'church_id' => $volunteer->church_id,
            'mission_volunteer_id' => $volunteer->id,
            'invited_by_user_id' => $invitedBy?->id,
            'token' => MissionInvitation::createToken(),
            'status' => 'sent',
            'channel' => 'email',
            'sent_at' => now(),
        ]);

        $invitation->loadMissing(['volunteer.church', 'invitedBy']);

        Mail::to($to)->send(new MissionVolunteerInviteMail($invitation));

        $volunteer->forceFill(['last_invite_sent_at' => now()])->save();

        return true;
    }
}
