<?php

namespace App\Domain\Users\Actions;

use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Models\Ministry;
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
        $churchId = (int) ($data['church_id'] ?? 0);
        $requestedMinistryIds = collect($data['volunteer_ministry_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $allowedMinistryIds = $churchId > 0 && $requestedMinistryIds !== []
            ? Ministry::query()
                ->where('church_id', $churchId)
                ->whereIn('id', $requestedMinistryIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all()
            : [];

        $userPayload = $data;
        unset($userPayload['volunteer_ministry_ids']);

        // Se já selecionou departamentos (no cadastro), consideramos voluntário automaticamente.
        $isVolunteer = (bool) ($userPayload['is_volunteer'] ?? false) || count($allowedMinistryIds) > 0;

        $user = User::create([
            'name' => $userPayload['name'],
            'email' => $userPayload['email'],
            'password' => Hash::make((string) ($userPayload['password'] ?? Str::password())),
            'church_id' => $userPayload['church_id'],
            'phone' => $userPayload['phone'] ?? null,
            'birth_date' => $userPayload['birth_date'] ?? null,
            'address' => $userPayload['address'] ?? null,
            'status' => $userPayload['status'] ?? 'active',
            'is_volunteer' => $isVolunteer,
            'is_ministry_leader' => (bool) ($userPayload['is_ministry_leader'] ?? false),
            'photo_url' => $userPayload['photo_url'] ?? null,
            'notify_via_app' => (bool) ($userPayload['notify_via_app'] ?? true),
            'notify_via_email' => (bool) ($userPayload['notify_via_email'] ?? true),
            'notify_via_whatsapp' => (bool) ($userPayload['notify_via_whatsapp'] ?? false),
            'lgpd_accepted_at' => $userPayload['lgpd_accepted_at'] ?? null,
        ]);

        $user->syncVolunteerRecord();

        $volunteer = $user->fresh()->volunteerProfile;
        if ($volunteer !== null) {
            $syncIds = $isVolunteer ? $allowedMinistryIds : [];
            app(SyncVolunteerMinistryAttachments::class)($volunteer, $syncIds);
            $user->fresh()->ensureVolunteerProfile();
        }

        return $user->fresh();
    }
}
