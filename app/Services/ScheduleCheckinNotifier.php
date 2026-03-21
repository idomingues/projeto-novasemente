<?php

namespace App\Services;

use App\Mail\ScheduleCheckinEnabledMail;
use App\Models\Church;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\User;
use App\Models\UserInboxNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;

class ScheduleCheckinNotifier
{
    public function notifyForDate(Carbon $date): void
    {
        $church = Church::where('active', true)->orderBy('name')->first();
        if (! $church) {
            return;
        }

        $month = (int) $date->month;
        $year = (int) $date->year;
        $dateYmd = $date->format('Y-m-d');
        $label = $date->translatedFormat('d \d\e F \d\e Y');

        $photo = fn () => null;

        $memberIds = [];
        $ministries = Ministry::query()->where('church_id', $church->id)->get(['id']);
        foreach ($ministries as $m) {
            $rows = ScheduleAssignmentPresenter::monthAssignmentsForMinistry($m->id, $year, $month, $photo);
            foreach ($rows as $r) {
                if (($r['scheduleDate'] ?? null) === $dateYmd) {
                    $memberIds[] = $r['memberId'];
                }
            }
        }
        $memberIds = array_values(array_unique($memberIds));

        if ($memberIds === []) {
            return;
        }

        foreach (Member::whereIn('id', $memberIds)->get() as $member) {
            if ($member->email && filter_var($member->email, FILTER_VALIDATE_EMAIL)) {
                Mail::to($member->email)->send(
                    new ScheduleCheckinEnabledMail($label, route('mobile.schedule.checkin', ['date' => $dateYmd], true))
                );
            }
        }

        foreach (User::whereIn('member_id', $memberIds)->get() as $user) {
            $row = UserInboxNotification::create([
                'user_id' => $user->id,
                'title' => 'Check-in liberado',
                'body' => 'O check-in para a escala do dia '.$label.' foi liberado. Toque para registar a sua presença.',
                'action_url' => null,
            ]);
            $row->update([
                'action_url' => route('mobile.schedule.checkin', ['date' => $dateYmd, 'inbox' => $row->id], true),
            ]);
        }
    }
}
