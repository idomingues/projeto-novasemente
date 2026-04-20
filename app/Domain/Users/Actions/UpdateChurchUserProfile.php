<?php

namespace App\Domain\Users\Actions;

use App\Models\User;

class UpdateChurchUserProfile
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(User $user, array $data): User
    {
        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_volunteer' => (bool) ($data['is_volunteer'] ?? false),
        ]);
        $user->ensureVolunteerProfile();

        return $user->fresh();
    }
}
