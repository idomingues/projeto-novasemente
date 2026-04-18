<?php

namespace App\Services;

use App\Models\Ministry;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;

class VolunteerMinistryRosterNotifier
{
    /**
     * @param  list<int>  $addedMinistryIds
     */
    public function notifyLeadersOfNewAttachments(Volunteer $volunteer, array $addedMinistryIds): void
    {
        $volunteer->loadMissing('user');
        $name = $volunteer->display_name;

        foreach ($addedMinistryIds as $ministryId) {
            $ministryId = (int) $ministryId;
            if ($ministryId <= 0) {
                continue;
            }
            $ministry = Ministry::query()->find($ministryId);
            if (! $ministry) {
                continue;
            }

            $leaderIds = $ministry->users()->pluck('users.id')->map(fn ($id) => (int) $id)->unique()->values()->all();
            foreach ($leaderIds as $leaderUserId) {
                if ($volunteer->user_id && $leaderUserId === (int) $volunteer->user_id) {
                    continue;
                }

                $row = UserInboxNotification::create([
                    'user_id' => $leaderUserId,
                    'title' => 'Novo voluntário no ministério',
                    'body' => $name.' entrou em «'.$ministry->name.'». Revise critérios e liberação.',
                    'action_url' => null,
                ]);

                $row->update([
                    'action_url' => route('ministry-lead.volunteers.show', [
                        'ministry' => $ministry->id,
                        'volunteer' => $volunteer->id,
                        'inbox' => $row->id,
                    ], absolute: true),
                ]);
            }
        }
    }
}
