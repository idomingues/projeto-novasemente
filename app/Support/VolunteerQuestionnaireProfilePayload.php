<?php

namespace App\Support;

use App\Models\Volunteer;

/**
 * Payload do questionário de voluntário para modais (pedidos, sugestões, anexos).
 *
 * @return array<string, mixed>
 */
final class VolunteerQuestionnaireProfilePayload
{
    public static function fromVolunteer(Volunteer $volunteer): array
    {
        return [
            'id' => (int) $volunteer->id,
            'name' => $volunteer->name,
            'email' => $volunteer->email,
            'phone' => $volunteer->phone,
            'birthDate' => $volunteer->birth_date?->toDateString(),
            'hasWhatsapp' => $volunteer->has_whatsapp,
            'hasSocialNetworks' => $volunteer->has_social_networks,
            'attendanceDuration' => $volunteer->attendance_duration,
            'isOfficialMember' => $volunteer->is_official_member,
            'memberRecordAtNovaSemente' => $volunteer->member_record_at_nova_semente,
            'memberRecordChurch' => $volunteer->member_record_church,
            'hasPreviousMinistryVolunteerExperience' => $volunteer->has_previous_ministry_volunteer_experience,
            'previousMinistryDetails' => $volunteer->previous_ministry_details,
            'professionalArea' => $volunteer->professional_area,
            'ministryInvolvement' => $volunteer->ministry_involvement,
            'otherMinistryInterest' => $volunteer->other_ministry_interest,
            'giftsToDevelop' => $volunteer->gifts_to_develop,
            'needsPastoralGuidance' => $volunteer->needs_pastoral_guidance,
            'lgpdDataConsent' => $volunteer->lgpd_data_consent,
            'role' => $volunteer->role,
            'appAccessOnly' => (bool) ($volunteer->app_access_only ?? false),
        ];
    }
}
