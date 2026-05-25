<?php

namespace App\Actions\Volunteers;

use App\Models\User;
use App\Models\Volunteer;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\UserProfilePhotoResolver;
use App\Support\VolunteerAppLogin;
use App\Support\VolunteerContactDuplicateChecker;
use App\Support\VolunteerSignupName;
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

        $previousMinistryDetails = ($validated['has_previous_ministry_volunteer_experience'] ?? false)
            ? $this->ministryNamesForChurch($previousIds, $churchId)
            : null;
        $ministryInvolvement = ($validated['is_active_in_ministry'] ?? false)
            ? $this->ministryNamesForChurch($activeIds, $churchId)
            : 'Não';
        $otherMinistryInterest = ($validated['wants_other_ministry'] ?? false)
            ? $this->ministryNamesForChurch($otherIds, $churchId)
            : 'Não';

        $newMinistryIds = array_values(array_unique(array_merge($activeIds, $otherIds)));
        $existingMinistryIds = $volunteer->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->all();
        $addedMinistryIds = array_values(array_diff($newMinistryIds, $existingMinistryIds));

        $name = trim(((string) $validated['first_name']).' '.((string) $validated['last_name']));
        if ($name === '' || VolunteerSignupName::split($name) === null) {
            $existingName = trim((string) ($user->name ?: $volunteer->name));
            if ($existingName !== '') {
                $name = $existingName;
            }
        }
        $emailNorm = VolunteerContactDuplicateChecker::normalizeEmail((string) $validated['email']);
        $photoUrl = UserProfilePhotoResolver::resolveFromRequest($request);

        DB::transaction(function () use (
            $user,
            $volunteer,
            $validated,
            $name,
            $emailNorm,
            $photoUrl,
            $previousMinistryDetails,
            $ministryInvolvement,
            $otherMinistryInterest,
            $newMinistryIds,
            $addedMinistryIds,
            $notifyNewMinistryAttachments,
        ) {
            $user->forceFill([
                'name' => $name,
                'email' => $emailNorm ?? VolunteerContactDuplicateChecker::normalizeEmail((string) $validated['email']),
            ]);
            if (! empty($validated['password'])) {
                $user->password = $validated['password'];
            }
            if ($photoUrl !== null) {
                UserProfilePhotoResolver::deleteStoredUploadIfAny($user->photo_url);
                $user->photo_url = $photoUrl;
            }
            $user->forceFill(['is_volunteer' => true])->save();

            $volunteer->forceFill([
                'name' => $name,
                'email' => $user->email,
                'phone' => $validated['phone'] ?? null,
                'birth_date' => $validated['birth_date'],
                'has_whatsapp' => (bool) ($validated['has_whatsapp'] ?? false),
                'has_social_networks' => (bool) $validated['has_social_networks'],
                'attendance_duration' => (string) $validated['attendance_duration'],
                'is_official_member' => (bool) $validated['is_official_member'],
                'member_record_at_nova_semente' => array_key_exists('member_record_at_nova_semente', $validated)
                    ? (is_null($validated['member_record_at_nova_semente']) ? null : (bool) $validated['member_record_at_nova_semente'])
                    : null,
                'member_record_church' => $validated['member_record_church'] ?? null,
                'has_previous_ministry_volunteer_experience' => (bool) $validated['has_previous_ministry_volunteer_experience'],
                'previous_ministry_details' => $previousMinistryDetails,
                'ministry_involvement' => $ministryInvolvement,
                'other_ministry_interest' => $otherMinistryInterest,
                'gifts_to_develop' => $validated['gifts_to_develop'] ?? null,
                'professional_area' => $validated['professional_area'] ?? null,
                'lgpd_data_consent' => (bool) ($validated['lgpd_data_consent'] ?? false),
            ])->save();

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

            $user->syncVolunteerRecord();
            VolunteerAppLogin::syncLoginEmailFromVolunteer($user->fresh() ?? $user, $volunteer->fresh());
        });
    }

    /**
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private function normalizeIdList(array $ids): array
    {
        return array_values(array_unique(array_filter(array_map('intval', $ids), fn ($id) => $id > 0)));
    }

    /**
     * @param  list<int>  $ids
     */
    private function ministryNamesForChurch(array $ids, int $churchId): string
    {
        if ($ids === []) {
            return '';
        }

        return \App\Models\Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->pluck('name')
            ->join(', ');
    }
}
