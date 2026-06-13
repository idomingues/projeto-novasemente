<?php

namespace Tests\Support;

use App\Models\User;
use App\Models\Volunteer;
use App\Support\VolunteerSignupServiceEaseAreas;

final class CompleteVolunteerSignup
{
    public static function apply(User $user, Volunteer $volunteer): void
    {
        $volunteer->forceFill([
            'birth_date' => '1988-05-20',
            'has_whatsapp' => true,
            'has_social_networks' => true,
            'social_network_profiles' => '@voluntario.ns',
            'professional_area' => 'Tecnologia',
            'attendance_duration' => 'years_1_2',
            'is_official_member' => false,
            'volunteer_phase' => 'interested',
            'service_ease_areas' => VolunteerSignupServiceEaseAreas::encode(['technology', 'communication']),
            'comfortable_with_digital_tools' => true,
            'service_greatest_strength' => 'Organização',
            'service_greatest_challenge' => 'Tempo disponível',
            'lgpd_data_consent' => true,
        ])->save();

        $user->forceFill([
            'name' => $user->name !== '' ? $user->name : 'João Silva',
            'photo_url' => $user->photo_url ?: 'https://example.com/photos/voluntario.jpg',
            'is_volunteer' => true,
        ])->save();
    }
}
