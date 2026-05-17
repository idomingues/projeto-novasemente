<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

final class MissionVolunteerPayload
{
    /** @return array<string, mixed> */
    public static function validationRules(?MissionVolunteer $existing = null): array
    {
        $cfg = config('mission');
        $belonging = $cfg['belonging_levels'] ?? [];

        return [
            'photo_file' => ['nullable', 'image', 'max:4096'],
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'birth_date' => ['required', 'date', 'before:today'],
            'phone' => ['required', 'string', 'max:40'],
            'full_address' => ['required', 'string', 'max:2000'],
            'profession' => ['required', 'string', 'max:120'],
            'profession_other' => ['nullable', 'string', 'max:120'],
            'has_belief' => ['required', 'boolean'],
            'belief_which' => ['nullable', 'string', 'max:120'],
            'belief_which_other' => ['nullable', 'string', 'max:120'],
            'participates_religion' => ['required', 'boolean'],
            'religion_which' => ['nullable', 'string', 'max:120'],
            'religion_which_other' => ['nullable', 'string', 'max:120'],
            'baptized' => ['required', 'boolean'],
            'seeks_in_community' => ['required', 'array', 'min:1'],
            'seeks_in_community.*' => ['string', 'max:120'],
            'seeks_in_community_other' => ['nullable', 'string', 'max:120'],
            'studied_bible' => ['required', 'string', Rule::in($cfg['studied_bible'] ?? [])],
            'studied_bible_structured' => ['required', 'boolean'],
            'first_time_nova_semente' => ['required', 'boolean'],
            'first_contact_via' => ['required', 'string', 'max:80'],
            'first_contact_via_other' => ['nullable', 'string', 'max:120'],
            'wants_bible_study_partner' => ['required', 'string', Rule::in($cfg['wants_bible_study_partner'] ?? [])],
            'if_not_how_long' => ['nullable', 'string', Rule::in($cfg['duration_buckets'] ?? [])],
            'insight_duration' => ['required', 'string', Rule::in($cfg['duration_buckets'] ?? [])],
            'participated_groups' => ['required', 'array', 'min:1'],
            'participated_groups.*' => ['string', 'max:120'],
            'participated_groups_other' => ['nullable', 'string', 'max:120'],
            'engagement_level' => ['required', 'string', Rule::in($cfg['engagement_levels'] ?? [])],
            'closer_to_god_text' => ['required', 'string', 'max:5000'],
            'belonging_people' => ['required', 'string', Rule::in($belonging)],
            'belonging_location' => ['required', 'string', Rule::in($belonging)],
            'belonging_availability' => ['required', 'string', Rule::in($belonging)],
            'belonging_spirituality' => ['required', 'string', Rule::in($belonging)],
            'social_actions_interest' => ['required', 'string', Rule::in($cfg['social_actions_interest'] ?? [])],
            'profile_type' => ['required', 'string', Rule::in($cfg['profile_types'] ?? [])],
            'ministry_preference' => ['required', 'string', Rule::in($cfg['ministry_preferences'] ?? [])],
            'social_action_type' => ['required', 'string', Rule::in($cfg['social_action_types'] ?? [])],
            'weekday_availability' => ['required', 'string', Rule::in($cfg['weekday_availability'] ?? [])],
            'time_per_week' => ['required', 'string', Rule::in($cfg['time_per_week'] ?? [])],
            'work_preference' => ['required', 'string', Rule::in($cfg['work_preferences'] ?? [])],
            'can_contact_week' => ['required', 'boolean'],
            'contact_period' => ['nullable', 'string', Rule::in($cfg['contact_periods'] ?? [])],
            'contact_format' => ['nullable', 'string', Rule::in($cfg['contact_formats'] ?? [])],
            'nps_score' => ['required', 'integer', 'min:0', 'max:10'],
            'lgpd_consent' => ['accepted'],
        ];
    }

    /** @param  array<string, mixed>  $valid */
    public static function storePhoto(Request $request, ?MissionVolunteer $existing = null): ?string
    {
        if (! $request->hasFile('photo_file')) {
            return $existing?->photo_path;
        }

        $file = $request->file('photo_file');
        if ($existing?->photo_path) {
            Storage::disk('public')->delete($existing->photo_path);
        }

        return $file->store('mission/photos', 'public');
    }

    /** @return array<string, mixed> */
    public static function toModelAttributes(array $valid, ?string $photoPath): array
    {
        return [
            'photo_path' => $photoPath,
            'full_name' => $valid['full_name'],
            'email' => isset($valid['email']) ? trim((string) $valid['email']) ?: null : null,
            'birth_date' => $valid['birth_date'],
            'phone' => $valid['phone'],
            'full_address' => $valid['full_address'],
            'profession' => $valid['profession'],
            'profession_other' => $valid['profession_other'] ?? null,
            'has_belief' => (bool) $valid['has_belief'],
            'belief_which' => $valid['belief_which'] ?? null,
            'belief_which_other' => $valid['belief_which_other'] ?? null,
            'participates_religion' => (bool) $valid['participates_religion'],
            'religion_which' => $valid['religion_which'] ?? null,
            'religion_which_other' => $valid['religion_which_other'] ?? null,
            'baptized' => (bool) $valid['baptized'],
            'seeks_in_community' => array_values($valid['seeks_in_community'] ?? []),
            'seeks_in_community_other' => $valid['seeks_in_community_other'] ?? null,
            'studied_bible' => $valid['studied_bible'],
            'studied_bible_structured' => (bool) $valid['studied_bible_structured'],
            'first_time_nova_semente' => (bool) $valid['first_time_nova_semente'],
            'first_contact_via' => $valid['first_contact_via'],
            'first_contact_via_other' => $valid['first_contact_via_other'] ?? null,
            'wants_bible_study_partner' => $valid['wants_bible_study_partner'],
            'if_not_how_long' => $valid['if_not_how_long'] ?? null,
            'insight_duration' => $valid['insight_duration'],
            'participated_groups' => array_values($valid['participated_groups'] ?? []),
            'participated_groups_other' => $valid['participated_groups_other'] ?? null,
            'engagement_level' => $valid['engagement_level'],
            'closer_to_god_text' => $valid['closer_to_god_text'],
            'belonging_people' => $valid['belonging_people'],
            'belonging_location' => $valid['belonging_location'],
            'belonging_availability' => $valid['belonging_availability'],
            'belonging_spirituality' => $valid['belonging_spirituality'],
            'social_actions_interest' => $valid['social_actions_interest'],
            'profile_type' => $valid['profile_type'],
            'ministry_preference' => $valid['ministry_preference'],
            'social_action_type' => $valid['social_action_type'],
            'weekday_availability' => $valid['weekday_availability'],
            'time_per_week' => $valid['time_per_week'],
            'work_preference' => $valid['work_preference'],
            'can_contact_week' => (bool) $valid['can_contact_week'],
            'contact_period' => $valid['contact_period'] ?? null,
            'contact_format' => $valid['contact_format'] ?? null,
            'nps_score' => (int) $valid['nps_score'],
            'lgpd_consent' => true,
        ];
    }

    /** @return array<string, mixed> */
    public static function serializeForFrontend(MissionVolunteer $v): array
    {
        return [
            'id' => $v->id,
            'photoUrl' => $v->photo_url,
            'fullName' => $v->full_name,
            'email' => $v->email,
            'birthDate' => $v->birth_date?->format('Y-m-d'),
            'phone' => $v->phone,
            'fullAddress' => $v->full_address,
            'profession' => $v->profession,
            'professionOther' => $v->profession_other,
            'hasBelief' => $v->has_belief,
            'beliefWhich' => $v->belief_which,
            'beliefWhichOther' => $v->belief_which_other,
            'participatesReligion' => $v->participates_religion,
            'religionWhich' => $v->religion_which,
            'religionWhichOther' => $v->religion_which_other,
            'baptized' => $v->baptized,
            'seeksInCommunity' => $v->seeks_in_community ?? [],
            'seeksInCommunityOther' => $v->seeks_in_community_other,
            'studiedBible' => $v->studied_bible,
            'studiedBibleStructured' => $v->studied_bible_structured,
            'firstTimeNovaSemente' => $v->first_time_nova_semente,
            'firstContactVia' => $v->first_contact_via,
            'firstContactViaOther' => $v->first_contact_via_other,
            'wantsBibleStudyPartner' => $v->wants_bible_study_partner,
            'ifNotHowLong' => $v->if_not_how_long,
            'insightDuration' => $v->insight_duration,
            'participatedGroups' => $v->participated_groups ?? [],
            'participatedGroupsOther' => $v->participated_groups_other,
            'engagementLevel' => $v->engagement_level,
            'closerToGodText' => $v->closer_to_god_text,
            'belongingPeople' => $v->belonging_people,
            'belongingLocation' => $v->belonging_location,
            'belongingAvailability' => $v->belonging_availability,
            'belongingSpirituality' => $v->belonging_spirituality,
            'socialActionsInterest' => $v->social_actions_interest,
            'profileType' => $v->profile_type,
            'ministryPreference' => $v->ministry_preference,
            'socialActionType' => $v->social_action_type,
            'weekdayAvailability' => $v->weekday_availability,
            'timePerWeek' => $v->time_per_week,
            'workPreference' => $v->work_preference,
            'canContactWeek' => $v->can_contact_week,
            'contactPeriod' => $v->contact_period,
            'contactFormat' => $v->contact_format,
            'npsScore' => $v->nps_score,
            'lgpdConsent' => $v->lgpd_consent,
            'phaseId' => $v->mission_phase_id,
            'phaseName' => $v->phase?->name,
            'createdAt' => $v->created_at?->toIso8601String(),
            'lastInviteSentAt' => $v->last_invite_sent_at?->toIso8601String(),
        ];
    }
}
