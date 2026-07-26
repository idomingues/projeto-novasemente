<?php

namespace App\Actions\Volunteers;

use App\Mail\VolunteerMinistryInvitationMail;
use App\Models\UserInboxNotification;
use App\Models\VolunteerMinistryInvitation;
use App\Support\UserMessagingPreferences;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Envia e-mail e/ou notificação no app para um convite já existente.
 *
 * @param  list<string>  $channels  `email`, `inbox`
 */
final class NotifyVolunteerMinistryInvitation
{
    public function __invoke(VolunteerMinistryInvitation $inv, array $channels): bool
    {
        $inv->loadMissing(['volunteer.user', 'ministry', 'slots', 'church']);

        $channels = array_values(array_unique(array_filter($channels, fn ($c) => is_string($c) && $c !== '')));
        if ($channels === []) {
            return false;
        }

        $inboxActionUrl = route('volunteers.ministry-invite.show', ['token' => $inv->token], true);
        $ministry = $inv->ministry;
        $ministryLabel = trim((string) ($ministry?->name ?? '')) ?: 'Departamento';

        $sent = false;

        if (in_array('email', $channels, true)) {
            $to = trim((string) ($inv->volunteer->email ?? ''));
            if ($to === '' && $inv->volunteer->user) {
                $to = trim((string) ($inv->volunteer->user->email ?? ''));
            }
            if ($to !== '') {
                Mail::to($to)->send(new VolunteerMinistryInvitationMail($inv));
                $sent = true;
                $inv->forceFill(['channel' => 'email'])->save();
            }
        }

        if (in_array('inbox', $channels, true) && $inv->volunteer->user && Schema::hasTable('user_inbox_notifications')) {
            $user = $inv->volunteer->user;
            if (UserMessagingPreferences::acceptsInbox($user)) {
                $hasLinkedAccount = BuildVolunteerMinistryInvitePlainCopy::hasLinkedAppAccount($inv);
                $inboxBody = $hasLinkedAccount
                    ? 'Você foi convidado(a) para «'.$ministryLabel.'». Toque para aceitar ou recusar o convite no app.'
                    : 'Você foi convidado(a) para servir em «'.$ministryLabel.'». Toque para ver o convite e concluir seu cadastro no app.';

                $row = UserInboxNotification::create([
                    'user_id' => $user->id,
                    'title' => 'Convite — '.$ministryLabel,
                    'body' => $inboxBody,
                    'intent' => UserInboxNotification::INTENT_ACTION,
                    'action_url' => $inboxActionUrl,
                ]);
                $row->update(['action_url' => $inboxActionUrl]);
                $sent = true;
                if ($inv->channel === null) {
                    $inv->forceFill(['channel' => 'inbox'])->save();
                }
            }
        }

        if ($sent) {
            $inv->forceFill(['sent_at' => now()])->save();
        }

        return $sent;
    }
}
