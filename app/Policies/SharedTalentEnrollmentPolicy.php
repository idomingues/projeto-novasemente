<?php

namespace App\Policies;

use App\Models\SharedTalentEnrollment;
use App\Models\User;
use App\Support\SharedTalentEnrollmentStatus;
use App\Support\SpatiePermissionCheck;

class SharedTalentEnrollmentPolicy
{
    public function approve(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->listing->user_id === $user->id
            && $enrollment->status === SharedTalentEnrollment::STATUS_AWAITING_APPROVAL;
    }

    public function reject(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->listing->user_id === $user->id
            && $enrollment->status === SharedTalentEnrollment::STATUS_AWAITING_APPROVAL;
    }

    public function updateStatusAsPublisher(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->listing->user_id === $user->id;
    }

    public function cancelAsParticipant(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->user_id === $user->id
            && ! in_array($enrollment->status, [
                SharedTalentEnrollment::STATUS_COMPLETED,
                SharedTalentEnrollment::STATUS_CANCELLED,
                SharedTalentEnrollment::STATUS_REJECTED,
            ], true);
    }

    public function sendMessage(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->user_id === $user->id
            || $enrollment->listing->user_id === $user->id;
    }

    public function review(User $user, SharedTalentEnrollment $enrollment): bool
    {
        if (! SharedTalentEnrollmentStatus::allowsReview($enrollment->status)) {
            return false;
        }

        return $enrollment->user_id === $user->id
            || $enrollment->listing->user_id === $user->id;
    }

    public function view(User $user, SharedTalentEnrollment $enrollment): bool
    {
        return $enrollment->user_id === $user->id
            || $enrollment->listing->user_id === $user->id
            || SpatiePermissionCheck::userHas($user, 'shared_talents.moderate')
            || $user->hasAnyRole(['super_admin', 'admin']);
    }
}
