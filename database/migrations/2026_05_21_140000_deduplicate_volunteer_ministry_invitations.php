<?php

use App\Models\VolunteerMinistryInvitation;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('volunteer_ministry_invitations')) {
            return;
        }

        $groups = VolunteerMinistryInvitation::query()
            ->select('church_id', 'volunteer_id', 'ministry_id')
            ->groupBy('church_id', 'volunteer_id', 'ministry_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($groups as $group) {
            $keepId = VolunteerMinistryInvitation::query()
                ->where('church_id', $group->church_id)
                ->where('volunteer_id', $group->volunteer_id)
                ->where('ministry_id', $group->ministry_id)
                ->orderByDesc('id')
                ->value('id');

            if (! $keepId) {
                continue;
            }

            VolunteerMinistryInvitation::query()
                ->where('church_id', $group->church_id)
                ->where('volunteer_id', $group->volunteer_id)
                ->where('ministry_id', $group->ministry_id)
                ->where('id', '!=', $keepId)
                ->where('status', 'pending')
                ->delete();
        }
    }

    public function down(): void
    {
        // Dados removidos não são restaurados.
    }
};
