<?php

namespace App\Services;

use App\Mail\ScheduleCheckinEnabledMail;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
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
        $volunteerIds = [];
        $ministries = Ministry::query()->where('church_id', $church->id)->get(['id']);
        foreach ($ministries as $m) {
            $rows = ScheduleAssignmentPresenter::monthAssignmentsForMinistry($m->id, $year, $month, $photo);
            foreach ($rows as $r) {
                if (($r['scheduleDate'] ?? null) !== $dateYmd) {
                    continue;
                }
                if (! empty($r['memberId'])) {
                    $memberIds[] = (int) $r['memberId'];
                } elseif (! empty($r['volunteerId'])) {
                    $volunteerIds[] = (int) $r['volunteerId'];
                }
            }
        }
        $memberIds = array_values(array_unique($memberIds));
        $volunteerIds = array_values(array_unique($volunteerIds));

        if ($memberIds === [] && $volunteerIds === []) {
            return;
        }

        $checkinUrl = route('mobile.schedule.checkin', ['date' => $dateYmd], true);

        foreach (User::whereIn('id', $memberIds)->get() as $user) {
            if ($user->email && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                Mail::to($user->email)->send(
                    new ScheduleCheckinEnabledMail($label, $checkinUrl)
                );
            }
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

        foreach (Volunteer::query()->whereIn('id', $volunteerIds)->get() as $volunteer) {
            if ($volunteer->email && filter_var($volunteer->email, FILTER_VALIDATE_EMAIL)) {
                Mail::to($volunteer->email)->send(
                    new ScheduleCheckinEnabledMail($label, $checkinUrl)
                );
            }
            if ($volunteer->user_id) {
                $user = User::query()->find($volunteer->user_id);
                if ($user) {
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
    }
}
