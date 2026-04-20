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
        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_volunteer' => (bool) ($data['is_volunteer'] ?? false),
        ];
        if (array_key_exists('photo_url', $data)) {
            $payload['photo_url'] = $data['photo_url'];
        }
        foreach (['notify_via_app', 'notify_via_email', 'notify_via_whatsapp'] as $k) {
            if (array_key_exists($k, $data)) {
                $payload[$k] = (bool) $data[$k];
            }
        }
        if (array_key_exists('lgpd_accepted_at', $data)) {
            $payload['lgpd_accepted_at'] = $data['lgpd_accepted_at'];
        }
        $user->update($payload);
        $user->ensureVolunteerProfile();

        return $user->fresh();
    }
}
