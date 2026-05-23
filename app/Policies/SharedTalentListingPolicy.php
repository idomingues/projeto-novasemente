<?php

namespace App\Policies;

use App\Models\SharedTalentListing;
use App\Models\User;
use App\Support\SpatiePermissionCheck;

class SharedTalentListingPolicy
{
    public function view(?User $user, SharedTalentListing $listing): bool
    {
        if ($listing->isVisibleInCatalog()) {
            return $user !== null;
        }

        return $user !== null && (
            $listing->user_id === $user->id
            || $this->isModerator($user)
        );
    }

    public function updateAsOwner(User $user, SharedTalentListing $listing): bool
    {
        return $listing->user_id === $user->id && $listing->isEditableByOwner();
    }

    public function pause(User $user, SharedTalentListing $listing): bool
    {
        return $listing->user_id === $user->id;
    }

    public function close(User $user, SharedTalentListing $listing): bool
    {
        return $listing->user_id === $user->id;
    }

    public function viewEnrollments(User $user, SharedTalentListing $listing): bool
    {
        return $listing->user_id === $user->id || $this->isModerator($user);
    }

    public function sendAnnouncement(User $user, SharedTalentListing $listing): bool
    {
        return $listing->user_id === $user->id;
    }

    public function moderate(User $user): bool
    {
        return $this->isModerator($user);
    }

    private function isModerator(User $user): bool
    {
        return SpatiePermissionCheck::userHas($user, 'shared_talents.moderate')
            || $user->hasAnyRole(['super_admin', 'admin']);
    }
}
