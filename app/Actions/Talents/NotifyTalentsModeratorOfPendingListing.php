<?php

namespace App\Actions\Talents;

use App\Models\TalentListing;
use App\Services\TalentConnectionNotifier;

class NotifyTalentsModeratorOfPendingListing
{
    public function handle(TalentListing $listing): void
    {
        app(TalentConnectionNotifier::class)->notifyModeratorsOfPendingListing($listing);
    }
}
