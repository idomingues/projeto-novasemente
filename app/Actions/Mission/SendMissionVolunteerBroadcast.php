<?php

namespace App\Actions\Mission;

use App\Mail\MissionVolunteerBroadcastMail;
use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Support\MissionVolunteerAccountResolver;
use App\Support\UserMessagingPreferences;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Mail;

final class SendMissionVolunteerBroadcast
{
    /**
     * @param  Collection<int, MissionVolunteer>  $volunteers
     * @return array{total: int, emails: int, app: int, skipped_no_channel: int}
     */
    public function __invoke(
        Collection $volunteers,
        Church $church,
        string $title,
        string $body,
        bool $sendEmail,
        bool $sendApp,
    ): array {
        $stats = [
            'total' => $volunteers->count(),
            'emails' => 0,
            'app' => 0,
            'skipped_no_channel' => 0,
        ];

        $emailed = [];
        $notifiedUserIds = [];

        foreach ($volunteers as $volunteer) {
            $user = MissionVolunteerAccountResolver::userForVolunteer($volunteer);
            $sentEmail = false;
            $sentApp = false;

            if ($sendApp && $user !== null && UserMessagingPreferences::acceptsInbox($user)) {
                if (! in_array($user->id, $notifiedUserIds, true)) {
                    $this->notifyUserInApp($user, $title, $body);
                    $notifiedUserIds[] = (int) $user->id;
                    $stats['app']++;
                    $sentApp = true;
                }
            }

            if ($sendEmail) {
                $email = MissionVolunteerAccountResolver::emailForVolunteer($volunteer, $user);
                if ($email !== null && ! in_array($email, $emailed, true)) {
                    $maySend = $user === null || UserMessagingPreferences::acceptsAccountEmail($user);
                    if ($maySend) {
                        Mail::to($email)->send(new MissionVolunteerBroadcastMail($volunteer, $church, $title, $body));
                        $emailed[] = $email;
                        $stats['emails']++;
                        $sentEmail = true;
                    }
                }
            }

            if (! $sentEmail && ! $sentApp) {
                $stats['skipped_no_channel']++;
            }
        }

        return $stats;
    }

    private function notifyUserInApp(User $user, string $title, string $body): void
    {
        $row = UserInboxNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'action_url' => route('mobile.mission', absolute: true),
        ]);

        $row->update([
            'action_url' => route('mobile.notifications', ['inbox' => $row->id], absolute: true),
        ]);
    }
}
