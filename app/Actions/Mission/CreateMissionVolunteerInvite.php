<?php

namespace App\Actions\Mission;

use App\Models\MissionInvitation;
use App\Models\MissionVolunteer;
use App\Models\User;

final class CreateMissionVolunteerInvite
{
    /**
     * @return array{invitation: MissionInvitation, link: string}
     */
    public function __invoke(MissionVolunteer $volunteer, ?User $invitedBy): array
    {
        $invitation = MissionInvitation::create([
            'church_id' => $volunteer->church_id,
            'mission_volunteer_id' => $volunteer->id,
            'invited_by_user_id' => $invitedBy?->id,
            'token' => MissionInvitation::createToken(),
            'status' => 'sent',
            'channel' => 'link',
            'sent_at' => now(),
        ]);

        $link = route('mobile.mission', [], true);

        return [
            'invitation' => $invitation,
            'link' => $link,
        ];
    }
}
