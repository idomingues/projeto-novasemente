<?php

namespace App\Domain\Users\Actions;

use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Models\Ministry;
use App\Models\User;

class UpdateChurchUserProfile
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function __invoke(User $user, array $data): User
    {
        $requestedMinistryIds = collect($data['volunteer_ministry_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $churchId = (int) ($user->church_id ?? 0);
        $allowedMinistryIds = $churchId > 0 && $requestedMinistryIds !== []
            ? Ministry::query()
                ->where('church_id', $churchId)
                ->whereIn('id', $requestedMinistryIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all()
            : [];

        // Se já selecionou departamentos (no cadastro), consideramos voluntário automaticamente.
        $isVolunteer = (bool) ($data['is_volunteer'] ?? false) || count($allowedMinistryIds) > 0;

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_volunteer' => $isVolunteer,
            'is_ministry_leader' => (bool) ($data['is_ministry_leader'] ?? false),
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
