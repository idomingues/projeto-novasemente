<?php

namespace App\Actions\Mission;

use App\Mail\MissionVolunteerInstructionsMail;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Support\VolunteerContactDuplicateChecker;
use Illuminate\Support\Facades\Mail;

final class SendMissionVolunteerInstructions
{
    public function __invoke(MissionVolunteer $volunteer): bool
    {
        $to = $this->resolveEmail($volunteer);
        if ($to === null) {
            return false;
        }

        if ($volunteer->email === null || trim((string) $volunteer->email) === '') {
            $volunteer->forceFill(['email' => $to])->save();
        }

        $volunteer->loadMissing('church');
        Mail::to($to)->send(new MissionVolunteerInstructionsMail($volunteer));

        $volunteer->forceFill(['last_invite_sent_at' => now()])->save();

        return true;
    }

    private function resolveEmail(MissionVolunteer $volunteer): ?string
    {
        $direct = $volunteer->display_email;
        if ($direct !== null) {
            return $direct;
        }

        $phoneNorm = VolunteerContactDuplicateChecker::normalizePhone((string) $volunteer->phone);
        if ($phoneNorm === null) {
            return null;
        }

        $users = User::query()
            ->where('church_id', $volunteer->church_id)
            ->whereNotNull('email')
            ->get(['id', 'email', 'phone']);

        foreach ($users as $user) {
            if (VolunteerContactDuplicateChecker::normalizePhone($user->phone) === $phoneNorm) {
                $email = trim((string) $user->email);

                return $email !== '' ? $email : null;
            }
        }

        return null;
    }
}
