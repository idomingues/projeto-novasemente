<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use Illuminate\Support\Collection;

/**
 * Valores iniciais do formulário de cadastro/edição de voluntário (Inertia).
 */
final class VolunteerSignupFormPrefill
{
    /**
     * @return array<string, mixed>
     */
    public static function forUser(User $user): array
    {
        $user->loadMissing('volunteerProfile');
        $volunteer = $user->volunteerProfile;
        if ($volunteer === null) {
            $user->ensureVolunteerProfile();
            $user->load('volunteerProfile');
            $volunteer = $user->volunteerProfile;
        }

        if ($volunteer === null) {
            return self::emptyFromUser($user);
        }

        $churchId = (int) ($user->church_id ?? 0);
        $ministries = $churchId > 0
            ? Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])
            : collect();

        return self::fromVolunteer($user, $volunteer, $ministries);
    }

    /**
     * @param  Collection<int, Ministry>  $ministries
     * @return array<string, mixed>
     */
    public static function fromVolunteer(User $user, Volunteer $volunteer, Collection $ministries): array
    {
        $fullName = trim((string) ($user->name ?: $volunteer->name));
        $nameParts = VolunteerSignupName::split($fullName);
        $firstName = $nameParts['first_name'] ?? '';
        $lastName = $nameParts['last_name'] ?? '';

        $previousIds = VolunteerSignupMinistryMapper::idsFromStoredNames(
            $volunteer->previous_ministry_details,
            $ministries
        );
        $activeIds = VolunteerSignupMinistryMapper::idsFromStoredNames(
            $volunteer->ministry_involvement,
            $ministries
        );
        $otherIds = VolunteerSignupMinistryMapper::idsFromStoredNames(
            $volunteer->other_ministry_interest,
            $ministries
        );

        $hasPrevious = $volunteer->has_previous_ministry_volunteer_experience;
        if ($hasPrevious === null && $previousIds !== []) {
            $hasPrevious = true;
        }

        $isActive = VolunteerSignupMinistryMapper::inferYesNoFromStoredText(
            $volunteer->ministry_involvement,
            $activeIds !== []
        );
        $wantsOther = VolunteerSignupMinistryMapper::inferYesNoFromStoredText(
            $volunteer->other_ministry_interest,
            $otherIds !== []
        );

        return [
            'photo_url' => $user->photo_url,
            'has_existing_photo' => is_string($user->photo_url) && trim($user->photo_url) !== '',
            'full_name' => $fullName,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'birth_date' => $volunteer->birth_date?->format('Y-m-d') ?? '',
            'has_whatsapp' => $volunteer->has_whatsapp,
            'email' => (string) ($user->email ?: $volunteer->email),
            'phone' => (string) ($volunteer->phone ?? ''),
            'has_social_networks' => $volunteer->has_social_networks,
            'attendance_duration' => (string) ($volunteer->attendance_duration ?? ''),
            'is_official_member' => $volunteer->is_official_member,
            'member_record_at_nova_semente' => $volunteer->member_record_at_nova_semente,
            'member_record_church' => (string) ($volunteer->member_record_church ?? ''),
            'has_previous_ministry_volunteer_experience' => $hasPrevious,
            'previous_ministry_ids' => $previousIds,
            'is_active_in_ministry' => $isActive,
            'active_ministry_ids' => $activeIds,
            'wants_other_ministry' => $wantsOther,
            'other_ministry_ids' => $otherIds,
            'ministry_involvement' => (string) ($volunteer->ministry_involvement ?? ''),
            'other_ministry_interest' => (string) ($volunteer->other_ministry_interest ?? ''),
            'previous_ministry_details' => (string) ($volunteer->previous_ministry_details ?? ''),
            'gifts_to_develop' => (string) ($volunteer->gifts_to_develop ?? ''),
            'professional_area' => (string) ($volunteer->professional_area ?? ''),
            'lgpd_data_consent' => $volunteer->lgpd_data_consent,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function emptyFromUser(User $user): array
    {
        $fullName = trim((string) $user->name);
        $parts = preg_split('/\s+/u', $fullName, 2) ?: [];

        return [
            'photo_url' => $user->photo_url,
            'has_existing_photo' => is_string($user->photo_url) && trim($user->photo_url) !== '',
            'full_name' => $fullName,
            'first_name' => $parts[0] ?? '',
            'last_name' => $parts[1] ?? '',
            'birth_date' => '',
            'has_whatsapp' => null,
            'email' => (string) ($user->email ?? ''),
            'phone' => '',
            'has_social_networks' => null,
            'attendance_duration' => '',
            'is_official_member' => null,
            'member_record_at_nova_semente' => null,
            'member_record_church' => '',
            'has_previous_ministry_volunteer_experience' => null,
            'previous_ministry_ids' => [],
            'is_active_in_ministry' => null,
            'active_ministry_ids' => [],
            'wants_other_ministry' => null,
            'other_ministry_ids' => [],
            'gifts_to_develop' => '',
            'professional_area' => '',
            'lgpd_data_consent' => null,
        ];
    }
}
