<?php

namespace App\Services;

use App\Models\Ministry;
use App\Models\User;
use App\Models\UserInboxNotification;
use App\Models\Volunteer;
use App\Support\UserMessagingPreferences;

class VolunteerMinistryRosterNotifier
{
    /**
     * Notifica apenas líderes do departamento (não admin/equipe geral).
     *
     * @param  list<int>  $addedMinistryIds
     */
    public function notifyLeadersOfNewAttachments(
        Volunteer $volunteer,
        array $addedMinistryIds,
        ?User $actor = null,
    ): void {
        $volunteer->loadMissing('user');
        $name = $volunteer->display_name;
        $actorId = $actor?->id;
        $volunteerUserId = $volunteer->user_id ? (int) $volunteer->user_id : null;

        foreach ($addedMinistryIds as $ministryId) {
            $ministryId = (int) $ministryId;
            if ($ministryId <= 0) {
                continue;
            }
            $ministry = Ministry::query()->find($ministryId);
            if (! $ministry) {
                continue;
            }

            $leaders = User::query()
                ->where(function ($q) {
                    $q->where('is_ministry_leader', true)
                        ->orWhereHas('roles', fn ($r) => $r->where('name', 'lider_ministerio'));
                })
                ->whereHas('ministries', fn ($q) => $q->where('ministries.id', $ministryId))
                ->when($actorId, fn ($q) => $q->where('users.id', '!=', (int) $actorId))
                ->when($volunteerUserId, fn ($q) => $q->where('users.id', '!=', $volunteerUserId))
                ->get(['id', 'name', 'notify_via_app']);

            foreach ($leaders as $leaderUser) {
                if (! UserMessagingPreferences::acceptsInbox($leaderUser)) {
                    continue;
                }

                $row = UserInboxNotification::create([
                    'user_id' => $leaderUser->id,
                    'title' => 'Novo voluntário no ministério',
                    'body' => $name.' entrou em «'.$ministry->name.'». Revise critérios e liberação.',
                    'intent' => UserInboxNotification::INTENT_ACTION,
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
