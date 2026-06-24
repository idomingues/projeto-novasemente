<?php

namespace App\Actions\Volunteers;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;

/**
 * Manifestação de interesse em departamentos no cadastro: apenas convite pendente,
 * sem vincular no pivot nem mover o pipeline para «Encaminhado».
 */
final class ApplyVolunteerSignupMinistryIntent
{
    /**
     * @param  list<int>  $ministryIds
     */
    public function __invoke(Volunteer $volunteer, array $ministryIds, int $churchId, ?User $invitedBy = null): void
    {
        $normalized = array_values(array_unique(array_filter(
            array_map('intval', $ministryIds),
            fn (int $id) => $id > 0
        )));

        if ($normalized === []) {
            return;
        }

        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $normalized)
            ->orderBy('name')
            ->get();

        if ($ministries->isEmpty()) {
            return;
        }

        $attachedIds = $volunteer->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        foreach ($ministries as $ministry) {
            if (in_array((int) $ministry->id, $attachedIds, true)) {
                continue;
            }

            app(CreateAndNotifyVolunteerMinistryInvitation::class)(
                $churchId,
                $volunteer,
                $ministry,
                $invitedBy,
                [],
                [],
            );
        }
    }
}
