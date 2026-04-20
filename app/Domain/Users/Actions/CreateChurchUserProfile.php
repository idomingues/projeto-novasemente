<?php

namespace App\Domain\Users\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

use function Illuminate\Support\tap;

class CreateChurchUserProfile
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data): User
    {
        return tap(User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make((string) ($data['password'] ?? Str::password())),
            'church_id' => $data['church_id'],
            'phone' => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_volunteer' => (bool) ($data['is_volunteer'] ?? false),
            'photo_url' => $data['photo_url'] ?? null,
            'notify_via_app' => (bool) ($data['notify_via_app'] ?? true),
            'notify_via_email' => (bool) ($data['notify_via_email'] ?? true),
            'notify_via_whatsapp' => (bool) ($data['notify_via_whatsapp'] ?? false),
            'lgpd_accepted_at' => $data['lgpd_accepted_at'] ?? null,
        ]), fn (User $u) => $u->ensureVolunteerProfile());
    }
}
