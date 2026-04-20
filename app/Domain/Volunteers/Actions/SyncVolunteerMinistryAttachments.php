<?php

namespace App\Domain\Volunteers\Actions;

use App\Models\Volunteer;
use App\Services\VolunteerMinistryRosterNotifier;
use Illuminate\Support\Facades\Schema;

class SyncVolunteerMinistryAttachments
{
    /**
     * Substitui os departamentos do voluntário e notifica líderes quando há novas entradas.
     *
     * @param  list<int|string>  $ministryIds
     */
    public function __invoke(Volunteer $volunteer, array $ministryIds): void
    {
        if (! Schema::hasTable('ministry_volunteer')) {
            return;
        }

        $newIds = collect($ministryIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $previousIds = $volunteer->exists
            ? $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all()
            : [];

        $volunteer->ministries()->sync($newIds);

        $added = array_values(array_diff($newIds, $previousIds));
        if ($added !== []) {
            app(VolunteerMinistryRosterNotifier::class)->notifyLeadersOfNewAttachments($volunteer->fresh(), $added);
        }
    }
}
