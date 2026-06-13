<?php

namespace App\Support;

use App\Models\User;
use App\Models\Volunteer;

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

        return self::fromVolunteer($user, $volunteer);
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromVolunteer(User $user, Volunteer $volunteer): array
    {
        $fullName = trim((string) ($user->name ?: $volunteer->name));
        $nameParts = VolunteerSignupName::split($fullName);
        if ($nameParts !== null) {
            $firstName = $nameParts['first_name'];
            $lastName = $nameParts['last_name'];
        } else {
            $firstName = $fullName;
            $lastName = '';
        }

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
            'social_network_profiles' => (string) ($volunteer->social_network_profiles ?? ''),
            'professional_area' => (string) ($volunteer->professional_area ?? ''),
            'attendance_duration' => (string) ($volunteer->attendance_duration ?? ''),
            'is_official_member' => $volunteer->is_official_member,
            'volunteer_phase' => (string) ($volunteer->volunteer_phase ?? ''),
            'service_ease_areas' => VolunteerSignupServiceEaseAreas::decode($volunteer->service_ease_areas),
            'comfortable_with_digital_tools' => $volunteer->comfortable_with_digital_tools,
            'service_greatest_strength' => (string) ($volunteer->service_greatest_strength ?? ''),
            'service_greatest_challenge' => (string) ($volunteer->service_greatest_challenge ?? ''),
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
            'social_network_profiles' => '',
            'professional_area' => '',
            'attendance_duration' => '',
            'is_official_member' => null,
            'volunteer_phase' => '',
            'service_ease_areas' => [],
            'comfortable_with_digital_tools' => null,
            'service_greatest_strength' => '',
            'service_greatest_challenge' => '',
            'lgpd_data_consent' => null,
        ];
    }
}
