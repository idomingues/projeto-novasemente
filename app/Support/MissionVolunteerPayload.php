<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use Illuminate\Validation\Rule;

final class MissionVolunteerPayload
{
    /** @return array<string, mixed> */
    public static function validationRules(?MissionVolunteer $existing = null): array
    {
        $cfg = config('mission');
        $studiedBibleOptions = array_values(array_unique(array_merge(
            $cfg['studied_bible'] ?? [],
            ['Sim, complemente'],
        )));

        return [
            'photo' => ['required', 'image', 'max:4096'],
            'full_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before:today'],
            'phone' => ['required', 'string', 'max:40'],
            'full_address' => ['required', 'string', 'max:2000'],
            'profession' => ['required', 'string', Rule::in($cfg['professions'] ?? [])],
            'has_belief' => ['required', 'boolean'],
            'belief_which' => [
                'nullable',
                'required_if:has_belief,true',
                'string',
                'max:120',
            ],
            'belief_which_other' => [
                'nullable',
                'required_if:belief_which,Outra',
                'string',
                'max:120',
            ],
            'participates_religion' => ['required', 'boolean'],
            'religion_which' => [
                'nullable',
                'required_if:participates_religion,true',
                'string',
                'max:120',
            ],
            'religion_which_other' => [
                'nullable',
                'required_if:religion_which,Outra',
                'string',
                'max:120',
            ],
            'baptized' => ['required', 'boolean'],
            'seeks_in_community' => ['required', 'array', 'min:1', 'max:1'],
            'seeks_in_community.*' => ['string', Rule::in($cfg['seeks_in_community'] ?? [])],
            'seeks_in_community_other' => [
                'nullable',
                'required_if:seeks_in_community.0,Outra',
                'string',
                'max:120',
            ],
            'studied_bible' => ['required', 'string', Rule::in($studiedBibleOptions)],
            'studied_bible_structured' => ['required', 'boolean'],
            'first_time_nova_semente' => ['required', 'boolean'],
            'first_contact_via' => ['required', 'string', Rule::in($cfg['first_contact_via'] ?? [])],
            'first_contact_via_other' => [
                'nullable',
                'required_if:first_contact_via,Outra',
                'string',
                'max:120',
            ],
            'wants_bible_study_partner' => ['required', 'string', Rule::in($cfg['wants_bible_study_partner'] ?? [])],
            'lgpd_consent' => ['accepted'],
        ];
    }

    /** @param  array<string, mixed>  $valid */
    public static function toModelAttributes(array $valid, ?string $photoPath = null): array
    {
        $beliefWhich = self::resolveChoiceWithOther(
            $valid['belief_which'] ?? null,
            $valid['belief_which_other'] ?? null,
        );
        $religionWhich = self::resolveChoiceWithOther(
            $valid['religion_which'] ?? null,
            $valid['religion_which_other'] ?? null,
        );
        $seeks = self::resolveSeeksInCommunity($valid);
        $firstContact = self::resolveChoiceWithOther(
            $valid['first_contact_via'] ?? null,
            $valid['first_contact_via_other'] ?? null,
        );

        return [
            'photo_path' => $photoPath,
            'full_name' => $valid['full_name'],
            'email' => null,
            'birth_date' => $valid['birth_date'],
            'phone' => $valid['phone'],
            'full_address' => $valid['full_address'],
            'profession' => $valid['profession'],
            'profession_other' => null,
            'has_belief' => (bool) $valid['has_belief'],
            'belief_which' => $beliefWhich['value'],
            'belief_which_other' => $beliefWhich['other'],
            'participates_religion' => (bool) $valid['participates_religion'],
            'religion_which' => $religionWhich['value'],
            'religion_which_other' => $religionWhich['other'],
            'baptized' => (bool) $valid['baptized'],
            'seeks_in_community' => $seeks['values'],
            'seeks_in_community_other' => $seeks['other'],
            'studied_bible' => $valid['studied_bible'],
            'studied_bible_structured' => (bool) $valid['studied_bible_structured'],
            'first_time_nova_semente' => (bool) $valid['first_time_nova_semente'],
            'first_contact_via' => $firstContact['value'],
            'first_contact_via_other' => $firstContact['other'],
            'wants_bible_study_partner' => $valid['wants_bible_study_partner'],
            'if_not_how_long' => null,
            'insight_duration' => null,
            'participated_groups' => [],
            'participated_groups_other' => null,
            'engagement_level' => null,
            'closer_to_god_text' => null,
            'belonging_people' => null,
            'belonging_location' => null,
            'belonging_availability' => null,
            'belonging_spirituality' => null,
            'social_actions_interest' => null,
            'profile_type' => null,
            'ministry_preference' => null,
            'social_action_type' => null,
            'weekday_availability' => null,
            'time_per_week' => null,
            'work_preference' => null,
            'can_contact_week' => null,
            'contact_period' => null,
            'contact_format' => null,
            'nps_score' => null,
            'lgpd_consent' => true,
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function resolveSeeksInCommunity(array $valid): array
    {
        $raw = $valid['seeks_in_community'] ?? [];
        $choice = is_array($raw) && isset($raw[0]) ? (string) $raw[0] : '';

        if ($choice === 'Outra') {
            $other = trim((string) ($valid['seeks_in_community_other'] ?? ''));

            return [
                'values' => ['Outra'],
                'other' => $other !== '' ? $other : null,
            ];
        }

        return [
            'values' => $choice !== '' ? [$choice] : [],
            'other' => null,
        ];
    }

    /**
     * @return array{value: ?string, other: ?string}
     */
    private static function resolveChoiceWithOther(?string $choice, ?string $otherText): array
    {
        $choice = $choice !== null ? trim($choice) : null;
        if ($choice === null || $choice === '') {
            return ['value' => null, 'other' => null];
        }

        if ($choice === 'Outra') {
            $other = trim((string) ($otherText ?? ''));

            return [
                'value' => 'Outra',
                'other' => $other !== '' ? $other : null,
            ];
        }

        return ['value' => $choice, 'other' => null];
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
            'lgpdConsent' => $v->lgpd_consent,
            'phaseId' => $v->mission_phase_id,
            'phaseName' => $v->phase?->name,
            'createdAt' => $v->created_at?->toIso8601String(),
            'lastInviteSentAt' => $v->last_invite_sent_at?->toIso8601String(),
        ];
    }
}
