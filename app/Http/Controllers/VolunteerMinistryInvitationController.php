<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationSlot;
use App\Mail\VolunteerMinistryInvitationMail;
use App\Support\UserMessagingPreferences;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class VolunteerMinistryInvitationController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canMutate(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('volunteers.ministry_operate') || $u->can('volunteers.manage'), 403);
    }

    public function store(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $this->canMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'ministry_id' => ['required', 'integer', Rule::exists('ministries', 'id')->where('church_id', $churchId)],
            'channels' => ['array'],
            'channels.*' => ['string', Rule::in(['email', 'inbox', 'manual'])],
            'slots' => ['array'],
            'slots.*.day_of_week' => ['required_with:slots', 'integer', 'min:0', 'max:6'],
            'slots.*.start_time' => ['nullable', 'date_format:H:i'],
            'slots.*.end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $ministry = Ministry::query()->where('church_id', $churchId)->findOrFail((int) $valid['ministry_id']);

        $inv = VolunteerMinistryInvitation::create([
            'church_id' => $churchId,
            'volunteer_id' => $volunteer->id,
            'ministry_id' => $ministry->id,
            'invited_by_user_id' => $request->user()?->id,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'pending',
            'expires_at' => now()->addDays(14),
        ]);

        $slots = is_array($valid['slots'] ?? null) ? $valid['slots'] : [];
        foreach ($slots as $row) {
            VolunteerMinistryInvitationSlot::create([
                'invitation_id' => $inv->id,
                'day_of_week' => (int) $row['day_of_week'],
                'start_time' => $row['start_time'] ?? null,
                'end_time' => $row['end_time'] ?? null,
            ]);
        }

        $inv->loadMissing(['volunteer.user', 'ministry', 'slots']);

        $channels = array_values(array_unique(array_filter($valid['channels'] ?? [], fn ($c) => is_string($c) && $c !== '')));
        if ($channels === []) {
            $channels = ['manual'];
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

        return back()
            ->with('success', 'Convite criado.')
            ->with('ministry_invite_link', $inviteUrl);
    }
}

