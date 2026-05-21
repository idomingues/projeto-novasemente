<?php

namespace App\Actions\Volunteers;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationSlot;

final class CreateAndNotifyVolunteerMinistryInvitation
{
    /**
     * @param  list<string>  $channels  ex.: `['email']`, `['inbox']`, `['email','inbox']`
     * @param  list<array{day_of_week: int, start_time?: string|null, end_time?: string|null}>  $slots
     */
    public function __invoke(
        int $churchId,
        Volunteer $volunteer,
        Ministry $ministry,
        ?User $invitedBy,
        array $channels,
        array $slots,
    ): VolunteerMinistryInvitation {
        $existing = VolunteerMinistryInvitation::findBlockingForMinistry(
            $churchId,
            (int) $volunteer->id,
            (int) $ministry->id,
        );
        if ($existing) {
            return $existing;
        }

        $inv = VolunteerMinistryInvitation::create([
            'church_id' => $churchId,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $invitedBy?->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        foreach ($slots as $row) {
            VolunteerMinistryInvitationSlot::create([
                'invitation_id' => $inv->id,
                'day_of_week' => (int) $row['day_of_week'],
                'start_time' => $row['start_time'] ?? null,
                'end_time' => $row['end_time'] ?? null,
            ]);
        }

        if ($channels !== []) {
            app(NotifyVolunteerMinistryInvitation::class)($inv, $channels);
        }

        return $inv;
    }
}
