<?php

namespace App\Domain\Users\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CreateChurchUserProfile
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make(Str::password()),
            'church_id' => $data['church_id'],
            'phone' => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_volunteer' => (bool) ($data['is_volunteer'] ?? false),
        ])->tap(fn (User $u) => $u->ensureVolunteerProfile());
    }
}
