<?php

namespace App\Actions\Volunteers;

use App\Mail\VolunteerMinistryInvitationMail;
use App\Models\Ministry;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationSlot;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

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

        $inv->loadMissing(['volunteer.user', 'ministry', 'slots']);

        $channels = array_values(array_unique(array_filter($channels, fn ($c) => is_string($c) && $c !== '')));
        if ($channels === []) {
            $channels = ['email'];
        }

        $inviteUrl = route('volunteers.ministry-invite.show', ['token' => $inv->token], true);

        $sent = false;
        if (in_array('email', $channels, true)) {
            $to = trim((string) ($inv->volunteer->email ?? ''));
            if ($to === '' && $inv->volunteer->user) {
                $to = trim((string) ($inv->volunteer->user->email ?? ''));
            }
            if ($to !== '') {
                Mail::to($to)->send(new VolunteerMinistryInvitationMail($inv, $inviteUrl));
                $sent = true;
                $inv->forceFill(['channel' => 'email'])->save();
            }
        }

        if (in_array('inbox', $channels, true) && $inv->volunteer->user && Schema::hasTable('user_inbox_notifications')) {
            $user = $inv->volunteer->user;
            if (UserMessagingPreferences::acceptsInbox($user)) {
                $title = 'Convite para novo departamento';
                $body = 'Você foi convidado(a) para servir em «'.$ministry->name.'». Toque para aceitar ou recusar.';
                $row = UserInboxNotification::create([
                    'user_id' => $user->id,
                    'title' => $title,
                    'body' => $body,
                    'action_url' => $inviteUrl,
                ]);
                $row->update(['action_url' => $inviteUrl]);
                $sent = true;
                $inv->forceFill(['channel' => 'inbox'])->save();
            }
        }

        if ($sent) {
            $inv->forceFill(['sent_at' => now()])->save();
        }

        return $inv;
    }
}
