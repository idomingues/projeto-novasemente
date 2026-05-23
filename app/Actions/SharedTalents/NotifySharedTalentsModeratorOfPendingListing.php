<?php

namespace App\Actions\SharedTalents;

use App\Models\SharedTalentListing;
use App\Services\SharedTalentNotifier;

class NotifySharedTalentsModeratorOfPendingListing
{
    public function __construct(
        private readonly SharedTalentNotifier $notifier,
    ) {}

    public function handle(SharedTalentListing $listing): void
    {
        $this->notifier->notifyModeratorsOfPendingListing($listing);
    }
}
