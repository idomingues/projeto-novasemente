<?php

namespace App\Actions\Volunteers;

use App\Models\User;
use App\Models\Volunteer;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerSignupCompletion;
use App\Support\VolunteerSignupName;
use App\Support\VolunteerSignupServiceEaseAreas;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Grava questionário de cadastro/edição de voluntário (payload já normalizado e validado).
 */
final class PersistVolunteerSignupQuestionnaire
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function __invoke(
        User $user,
        Volunteer $volunteer,
        array $validated,
        Request $request,
        int $churchId,
        bool $notifyNewMinistryAttachments = true,
    ): void {
        $previousIds = $this->normalizeIdList($validated['previous_ministry_ids'] ?? []);
        $activeIds = $this->normalizeIdList($validated['active_ministry_ids'] ?? []);
        $otherIds = $this->normalizeIdList($validated['other_ministry_ids'] ?? []);

        $newMinistryIds = array_values(array_unique(array_merge($activeIds, $otherIds)));
        $existingMinistryIds = $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->all();
        $addedMinistryIds = array_values(array_diff($newMinistryIds, $existingMinistryIds));

        $name = trim(((string) $validated['first_name']).' '.(((string) $validated['last_name'])));
        if ($name === '' || VolunteerSignupName::split($name) === null) {
            $existingName = trim((string) ($user->name ?: $volunteer->name));
            if ($existingName !== '') {
                $name = $existingName;
            }
        }
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail((string) $validated['email']);
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);
        $autosaveFields = $this->resolveAutosaveFieldKeys($request);
        $shouldSyncMinistryPivot = $this->shouldSyncMinistryPivot($autosaveFields, $newMinistryIds);

        $userPatch = $this->buildUserPersistAttributes(
            $validated,
            $name,
            $emailNorm,
            $photoUrl,
            $autosaveFields,
        );
        $volunteerPatch = $this->buildVolunteerPersistAttributes(
            $validated,
            $name,
            $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail((string) $validated['email']),
            $autosaveFields,
        );

        DB::transaction(function () use (
            $user,
            $volunteer,
            $validated,
            $photoUrl,
            $newMinistryIds,
            $addedMinistryIds,
            $notifyNewMinistryAttachments,
            $shouldSyncMinistryPivot,
            $userPatch,
            $volunteerPatch,
        ) {
            if ($userPatch !== []) {
                $user->forceFill($userPatch);
                if (! empty($validated['password'])) {
                    $user->password = $validated['password'];
                }
                if ($photoUrl !== null) {
                    UserProfilePhotoResolver::deleteStoredUploadIfAny($user->photo_url);
                    $user->photo_url = $photoUrl;
                }
                $user->save();
            } elseif ($photoUrl !== null) {
                UserProfilePhotoResolver::deleteStoredUploadIfAny($user->photo_url);
                $user->forceFill(['photo_url' => $photoUrl])->save();
            } elseif (! empty($validated['password'])) {
                $user->forceFill(['password' => $validated['password']])->save();
            }

            if ($volunteerPatch !== []) {
                $volunteer->forceFill($volunteerPatch)->save();
            }

            if ($shouldSyncMinistryPivot) {
                if ($newMinistryIds !== []) {
                    $volunteer->ministries()->sync($newMinistryIds);
                    if ($notifyNewMinistryAttachments && $addedMinistryIds !== []) {
                        app(VolunteerMinistryRosterNotifier::class)->notifyLeadersOfNewAttachments(
                            $volunteer->fresh(),
                            $addedMinistryIds
                        );
                    }
                } else {
                    $volunteer->ministries()->detach();
                }
            }

            $user->refresh();
            $user->load('volunteerProfile');
            $completion = VolunteerSignupCompletion::forUser($user);
            $user->forceFill(['is_volunteer' => $completion['is_complete']])->save();

            $user->syncVolunteerRecord();

            $freshUser = $user->fresh() ?? $user;
            $freshVolunteer = $freshUser->volunteerProfile;
            if ($freshVolunteer !== null) {
                VolunteerAppLogin::syncLoginEmailFromVolunteer($freshUser, $freshVolunteer);
            }
        });
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  list<string>|null  $autosaveFields
     * @return array<string, mixed>
     */
    private function buildUserPersistAttributes(
        array $validated,
        string $name,
        ?string $emailNorm,
        ?string $photoUrl,
        ?array $autosaveFields,
    ): array {
        $email = $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail((string) $validated['email']);

        if ($autosaveFields === null) {
            return array_filter([
                'name' => $name,
                'email' => $email,
            ], fn ($value) => $value !== null && $value !== '');
        }

        $saved = array_flip($autosaveFields);
        $patch = [];

        if (isset($saved['first_name']) || isset($saved['last_name'])) {
            $patch['name'] = $name;
        }
        if (isset($saved['email']) && $email !== null && $email !== '') {
            $patch['email'] = $email;
        }

        return $patch;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  list<string>|null  $autosaveFields
     * @return array<string, mixed>
     */
    private function buildVolunteerPersistAttributes(
        array $validated,
        string $name,
        ?string $email,
        ?array $autosaveFields,
    ): array {
        $hasSocialNetworks = (bool) ($validated['has_social_networks'] ?? false);

        $full = [
            'name' => $name,
            'email' => $email,
            'phone' => $this->nullableString($validated['phone'] ?? null),
            'birth_date' => $this->nullableDate($validated['birth_date'] ?? null),
            'has_whatsapp' => (bool) ($validated['has_whatsapp'] ?? false),
            'has_social_networks' => $hasSocialNetworks,
            'social_network_profiles' => $hasSocialNetworks
                ? $this->nullableString($validated['social_network_profiles'] ?? null)
                : null,
            'professional_area' => $this->nullableString($validated['professional_area'] ?? null),
            'attendance_duration' => $this->nullableString($validated['attendance_duration'] ?? null),
            'is_official_member' => (bool) ($validated['is_official_member'] ?? false),
            'volunteer_phase' => $this->nullableString($validated['volunteer_phase'] ?? null),
            'service_ease_areas' => VolunteerSignupServiceEaseAreas::encode($validated['service_ease_areas'] ?? []),
            'comfortable_with_digital_tools' => array_key_exists('comfortable_with_digital_tools', $validated)
                ? (is_null($validated['comfortable_with_digital_tools']) ? null : (bool) $validated['comfortable_with_digital_tools'])
                : null,
            'service_greatest_strength' => $this->nullableString($validated['service_greatest_strength'] ?? null),
            'service_greatest_challenge' => $this->nullableString($validated['service_greatest_challenge'] ?? null),
            'lgpd_data_consent' => (bool) ($validated['lgpd_data_consent'] ?? false),
        ];

        if ($autosaveFields === null) {
            return $full;
        }

        $saved = array_flip($autosaveFields);
        $patch = [];

        if (isset($saved['first_name']) || isset($saved['last_name'])) {
            $patch['name'] = $name;
        }
        if (isset($saved['email']) && $email !== null && $email !== '') {
            $patch['email'] = $email;
        }
        if (isset($saved['phone'])) {
            $patch['phone'] = $this->nullableString($validated['phone'] ?? null);
        }
        if (isset($saved['birth_date'])) {
            $patch['birth_date'] = $this->nullableDate($validated['birth_date'] ?? null);
        }
        if (isset($saved['has_whatsapp'])) {
            $patch['has_whatsapp'] = (bool) ($validated['has_whatsapp'] ?? false);
        }
        if (isset($saved['has_social_networks'])) {
            $patch['has_social_networks'] = $hasSocialNetworks;
            $patch['social_network_profiles'] = $hasSocialNetworks
                ? $this->nullableString($validated['social_network_profiles'] ?? null)
                : null;
        }
        if (isset($saved['social_network_profiles'])) {
            $patch['social_network_profiles'] = $hasSocialNetworks
                ? $this->nullableString($validated['social_network_profiles'] ?? null)
                : null;
        }
        if (isset($saved['professional_area'])) {
            $patch['professional_area'] = $this->nullableString($validated['professional_area'] ?? null);
        }
        if (isset($saved['attendance_duration'])) {
            $patch['attendance_duration'] = $this->nullableString($validated['attendance_duration'] ?? null);
        }
        if (isset($saved['is_official_member'])) {
            $patch['is_official_member'] = (bool) ($validated['is_official_member'] ?? false);
        }
        if (isset($saved['volunteer_phase'])) {
            $patch['volunteer_phase'] = $this->nullableString($validated['volunteer_phase'] ?? null);
        }
        if (isset($saved['service_ease_areas'])) {
            $patch['service_ease_areas'] = VolunteerSignupServiceEaseAreas::encode($validated['service_ease_areas'] ?? []);
        }
        if (isset($saved['comfortable_with_digital_tools'])) {
            $patch['comfortable_with_digital_tools'] = array_key_exists('comfortable_with_digital_tools', $validated)
                ? (is_null($validated['comfortable_with_digital_tools']) ? null : (bool) $validated['comfortable_with_digital_tools'])
                : null;
        }
        if (isset($saved['service_greatest_strength'])) {
            $patch['service_greatest_strength'] = $this->nullableString($validated['service_greatest_strength'] ?? null);
        }
        if (isset($saved['service_greatest_challenge'])) {
            $patch['service_greatest_challenge'] = $this->nullableString($validated['service_greatest_challenge'] ?? null);
        }
        if (isset($saved['lgpd_data_consent'])) {
            $patch['lgpd_data_consent'] = (bool) ($validated['lgpd_data_consent'] ?? false);
        }

        return $patch;
    }

    /**
     * @return list<string>|null null = envio completo (PUT), lista = autosave parcial
     */
    private function resolveAutosaveFieldKeys(Request $request): ?array
    {
        if (! $request->has('autosave_fields')) {
            return null;
        }

        $autosaveFields = $request->input('autosave_fields');
        if (is_string($autosaveFields)) {
            $decoded = json_decode($autosaveFields, true);
            $autosaveFields = is_array($decoded) ? $decoded : [];
        }

        if (! is_array($autosaveFields) || $autosaveFields === []) {
            return null;
        }

        return array_values(array_unique(array_map('strval', $autosaveFields)));
    }

    /**
     * @param  list<int>  $newMinistryIds
     * @param  list<string>|null  $autosaveFields
     */
    private function shouldSyncMinistryPivot(?array $autosaveFields, array $newMinistryIds): bool
    {
        if ($autosaveFields === null) {
            return $newMinistryIds !== [];
        }

        $ministryListFields = ['active_ministry_ids', 'other_ministry_ids', 'previous_ministry_ids'];

        return array_intersect($autosaveFields, $ministryListFields) !== [];
    }

    private function nullableDate(mixed $value): ?string
    {
        $normalized = trim((string) ($value ?? ''));

        return $normalized === '' ? null : $normalized;
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) ($value ?? ''));

        return $normalized === '' ? null : $normalized;
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private function normalizeIdList(array $ids): array
    {
        return array_values(array_unique(array_filter(array_map('intval', $ids), fn ($id) => $id > 0)));
    }
}
