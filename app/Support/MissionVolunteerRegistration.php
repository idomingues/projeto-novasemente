<?php

namespace App\Support;

use App\Models\MissionVolunteer;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

final class MissionVolunteerRegistration
{
    /** @var list<string> */
    public const STEP_ORDER = [
        'photo',
        'full_name',
        'birth_date',
        'phone',
        'full_address',
        'profession',
        'has_belief',
        'belief_which',
        'participates_religion',
        'religion_which',
        'baptized',
        'seeks_in_community',
        'studied_bible',
        'studied_bible_structured',
        'first_time_nova_semente',
        'first_contact_via',
        'wants_bible_study_partner',
        'spiritual_journey',
        'comfortable_environment',
        'group_project_preference',
        'interest_areas',
        'learning_style',
        'personalized_bible_study_interest',
        'mission_social_projects_interest',
        'start_area_preference',
        'talents_for_god',
        'team_support_notes',
        'lgpd_consent',
    ];

    /** @return list<string> */
    public static function stepIds(): array
    {
        return self::STEP_ORDER;
    }

    /**
     * @param  array<string, mixed>  $answers
     * @return list<string>
     */
    public static function visibleSteps(array $answers): array
    {
        return array_values(array_filter(
            self::STEP_ORDER,
            fn (string $step) => self::isStepVisible($step, $answers),
        ));
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public static function isStepVisible(string $step, array $answers): bool
    {
        return match ($step) {
            'belief_which' => ($answers['has_belief'] ?? null) === true,
            'religion_which' => ($answers['participates_religion'] ?? null) === true,
            default => true,
        };
    }

    public static function sectionTitle(string $step): string
    {
        return match ($step) {
            'photo', 'full_name', 'birth_date', 'phone', 'full_address' => 'Dados pessoais',
            'profession' => 'Profissão',
            'has_belief', 'belief_which' => 'Fé e crença',
            'participates_religion', 'religion_which', 'baptized' => 'Religião',
            'seeks_in_community', 'studied_bible', 'studied_bible_structured' => 'Comunidade e Bíblia',
            'first_time_nova_semente', 'first_contact_via', 'wants_bible_study_partner' => 'Nova Semente',
            'spiritual_journey', 'comfortable_environment', 'group_project_preference' => 'Caminhada e convivência',
            'interest_areas', 'learning_style', 'personalized_bible_study_interest', 'mission_social_projects_interest', 'start_area_preference' => 'Interesses',
            'talents_for_god', 'team_support_notes', 'lgpd_consent' => 'Compartilhe mais',
            default => 'Cadastro',
        };
    }

    public static function questionNumber(string $step): int
    {
        return match ($step) {
            'photo' => 0,
            'full_name' => 1,
            'birth_date' => 2,
            'phone' => 3,
            'full_address' => 4,
            'profession' => 5,
            'has_belief' => 6,
            'belief_which' => 7,
            'participates_religion' => 8,
            'religion_which' => 9,
            'baptized' => 10,
            'seeks_in_community' => 11,
            'studied_bible' => 12,
            'studied_bible_structured' => 13,
            'first_time_nova_semente' => 14,
            'first_contact_via' => 15,
            'wants_bible_study_partner' => 16,
            'spiritual_journey' => 17,
            'comfortable_environment' => 18,
            'group_project_preference' => 19,
            'interest_areas' => 20,
            'learning_style' => 21,
            'personalized_bible_study_interest' => 22,
            'mission_social_projects_interest' => 23,
            'start_area_preference' => 24,
            'talents_for_god' => 25,
            'team_support_notes' => 26,
            'lgpd_consent' => 27,
            default => 0,
        };
    }

    public static function isOptionalStep(string $step): bool
    {
        return in_array($step, ['talents_for_god', 'team_support_notes'], true);
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public static function stepIndex(string $step, array $answers): int
    {
        $visible = self::visibleSteps($answers);
        $index = array_search($step, $visible, true);

        return $index === false ? 0 : (int) $index;
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public static function resolveResumeStepIndex(MissionVolunteer $volunteer, array $answers): int
    {
        $visible = self::visibleSteps($answers);
        $savedStep = $volunteer->registration_step;
        if (is_string($savedStep) && $savedStep !== '') {
            $idx = array_search($savedStep, $visible, true);
            if ($idx !== false) {
                return (int) $idx;
            }
        }

        foreach ($visible as $i => $step) {
            if (! self::isStepAnswered($step, $answers)) {
                return $i;
            }
        }

        return max(0, count($visible) - 1);
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public static function isStepAnswered(string $step, array $answers): bool
    {
        if (self::isOptionalStep($step)) {
            return true;
        }

        return match ($step) {
            'photo' => filled($answers['photo_path'] ?? null),
            'full_name' => filled(trim((string) ($answers['full_name'] ?? ''))),
            'birth_date' => filled($answers['birth_date'] ?? null),
            'phone' => filled(trim((string) ($answers['phone'] ?? ''))),
            'full_address' => filled(trim((string) ($answers['full_address'] ?? ''))),
            'profession' => filled($answers['profession'] ?? null)
                && (($answers['profession'] ?? '') !== 'Outra' || filled(trim((string) ($answers['profession_other'] ?? '')))),
            'has_belief' => ($answers['has_belief'] ?? null) !== null,
            'belief_which' => ($answers['has_belief'] ?? null) !== true
                || (filled($answers['belief_which'] ?? null)
                    && (($answers['belief_which'] ?? '') !== 'Outra' || filled(trim((string) ($answers['belief_which_other'] ?? ''))))),
            'participates_religion' => ($answers['participates_religion'] ?? null) !== null,
            'religion_which' => ($answers['participates_religion'] ?? null) !== true
                || (filled($answers['religion_which'] ?? null)
                    && (($answers['religion_which'] ?? '') !== 'Outra' || filled(trim((string) ($answers['religion_which_other'] ?? ''))))),
            'baptized' => ($answers['baptized'] ?? null) !== null,
            'seeks_in_community' => filled($answers['seeks_in_community'] ?? null)
                && (($answers['seeks_in_community'] ?? '') !== 'Outra' || filled(trim((string) ($answers['seeks_in_community_other'] ?? '')))),
            'studied_bible' => filled($answers['studied_bible'] ?? null),
            'studied_bible_structured' => ($answers['studied_bible_structured'] ?? null) !== null,
            'first_time_nova_semente' => ($answers['first_time_nova_semente'] ?? null) !== null,
            'first_contact_via' => filled($answers['first_contact_via'] ?? null)
                && (($answers['first_contact_via'] ?? '') !== 'Outra' || filled(trim((string) ($answers['first_contact_via_other'] ?? '')))),
            'wants_bible_study_partner' => filled($answers['wants_bible_study_partner'] ?? null),
            'spiritual_journey' => filled($answers['spiritual_journey'] ?? null),
            'comfortable_environment' => filled($answers['comfortable_environment'] ?? null),
            'group_project_preference' => filled($answers['group_project_preference'] ?? null),
            'interest_areas' => is_array($answers['interest_areas'] ?? null) && count($answers['interest_areas'] ?? []) > 0,
            'learning_style' => filled($answers['learning_style'] ?? null),
            'personalized_bible_study_interest' => filled($answers['personalized_bible_study_interest'] ?? null),
            'mission_social_projects_interest' => filled($answers['mission_social_projects_interest'] ?? null),
            'start_area_preference' => filled($answers['start_area_preference'] ?? null),
            'lgpd_consent' => ($answers['lgpd_consent'] ?? false) === true,
            default => false,
        };
    }

    public static function findDraftForUser(int $churchId, User $user): ?MissionVolunteer
    {
        return MissionVolunteer::query()
            ->where('church_id', $churchId)
            ->where('submitted_by_user_id', $user->id)
            ->whereNull('registration_completed_at')
            ->latest('updated_at')
            ->first();
    }

    public static function findCompletedForUser(int $churchId, User $user): ?MissionVolunteer
    {
        return MissionVolunteer::query()
            ->where('church_id', $churchId)
            ->where('submitted_by_user_id', $user->id)
            ->whereNotNull('registration_completed_at')
            ->latest('updated_at')
            ->first();
    }

    public static function findRegistrationForUser(int $churchId, User $user): ?MissionVolunteer
    {
        return self::findDraftForUser($churchId, $user)
            ?? self::findCompletedForUser($churchId, $user);
    }

    public static function hasCompletedRegistration(int $churchId, User $user): bool
    {
        return MissionVolunteer::query()
            ->where('church_id', $churchId)
            ->where('submitted_by_user_id', $user->id)
            ->whereNotNull('registration_completed_at')
            ->exists();
    }

    /** @return array<string, mixed> */
    public static function answersFromVolunteer(MissionVolunteer $volunteer): array
    {
        $seeks = $volunteer->seeks_in_community ?? [];

        return [
            'photo_path' => $volunteer->photo_path,
            'photo_url' => $volunteer->photo_url,
            'full_name' => $volunteer->full_name,
            'birth_date' => $volunteer->birth_date?->format('Y-m-d'),
            'phone' => $volunteer->phone,
            'full_address' => $volunteer->full_address,
            'profession' => $volunteer->profession,
            'profession_other' => $volunteer->profession_other,
            'has_belief' => $volunteer->has_belief,
            'belief_which' => $volunteer->belief_which,
            'belief_which_other' => $volunteer->belief_which_other,
            'participates_religion' => $volunteer->participates_religion,
            'religion_which' => $volunteer->religion_which,
            'religion_which_other' => $volunteer->religion_which_other,
            'baptized' => $volunteer->baptized,
            'seeks_in_community' => is_array($seeks) && isset($seeks[0]) ? (string) $seeks[0] : '',
            'seeks_in_community_other' => $volunteer->seeks_in_community_other,
            'studied_bible' => $volunteer->studied_bible,
            'studied_bible_structured' => $volunteer->studied_bible_structured,
            'first_time_nova_semente' => $volunteer->first_time_nova_semente,
            'first_contact_via' => $volunteer->first_contact_via,
            'first_contact_via_other' => $volunteer->first_contact_via_other,
            'wants_bible_study_partner' => $volunteer->wants_bible_study_partner,
            'spiritual_journey' => $volunteer->spiritual_journey,
            'comfortable_environment' => $volunteer->comfortable_environment,
            'group_project_preference' => $volunteer->group_project_preference,
            'interest_areas' => $volunteer->interest_areas ?? [],
            'learning_style' => $volunteer->learning_style,
            'personalized_bible_study_interest' => $volunteer->personalized_bible_study_interest,
            'mission_social_projects_interest' => $volunteer->mission_social_projects_interest,
            'start_area_preference' => $volunteer->start_area_preference,
            'talents_for_god' => $volunteer->talents_for_god,
            'team_support_notes' => $volunteer->team_support_notes,
            'lgpd_consent' => (bool) $volunteer->lgpd_consent,
        ];
    }

    /**
     * Índice da etapa visível no formulário (rascunho ou edição de cadastro concluído).
     *
     * @param  array<string, mixed>  $answers
     */
    public static function formStepIndex(MissionVolunteer $volunteer, array $answers): int
    {
        if ($volunteer->registration_completed_at !== null && $volunteer->registration_step === null) {
            return 0;
        }

        return self::resolveResumeStepIndex($volunteer, $answers);
    }

    /** @return array<string, mixed> */
    public static function draftPayload(?MissionVolunteer $draft): ?array
    {
        if ($draft === null) {
            return null;
        }

        $answers = self::answersFromVolunteer($draft);

        return [
            'id' => $draft->id,
            'stepIndex' => self::formStepIndex($draft, $answers),
            'stepId' => $draft->registration_step,
            'photoUrl' => $draft->photo_url,
            'fields' => self::frontendFieldsFromAnswers($answers),
        ];
    }

    /**
     * @param  array<string, mixed>  $answers
     * @return array<string, mixed>
     */
    public static function frontendFieldsFromAnswers(array $answers): array
    {
        return [
            'full_name' => (string) ($answers['full_name'] ?? ''),
            'birth_date' => (string) ($answers['birth_date'] ?? ''),
            'phone' => (string) ($answers['phone'] ?? ''),
            'full_address' => (string) ($answers['full_address'] ?? ''),
            'profession' => (string) ($answers['profession'] ?? ''),
            'profession_other' => (string) ($answers['profession_other'] ?? ''),
            'has_belief' => $answers['has_belief'] ?? null,
            'belief_which' => (string) ($answers['belief_which'] ?? ''),
            'belief_which_other' => (string) ($answers['belief_which_other'] ?? ''),
            'participates_religion' => $answers['participates_religion'] ?? null,
            'religion_which' => (string) ($answers['religion_which'] ?? ''),
            'religion_which_other' => (string) ($answers['religion_which_other'] ?? ''),
            'baptized' => $answers['baptized'] ?? null,
            'seeks_in_community' => (string) ($answers['seeks_in_community'] ?? ''),
            'seeks_in_community_other' => (string) ($answers['seeks_in_community_other'] ?? ''),
            'studied_bible' => (string) ($answers['studied_bible'] ?? ''),
            'studied_bible_structured' => $answers['studied_bible_structured'] ?? null,
            'first_time_nova_semente' => $answers['first_time_nova_semente'] ?? null,
            'first_contact_via' => (string) ($answers['first_contact_via'] ?? ''),
            'first_contact_via_other' => (string) ($answers['first_contact_via_other'] ?? ''),
            'wants_bible_study_partner' => (string) ($answers['wants_bible_study_partner'] ?? ''),
            'spiritual_journey' => (string) ($answers['spiritual_journey'] ?? ''),
            'comfortable_environment' => (string) ($answers['comfortable_environment'] ?? ''),
            'group_project_preference' => (string) ($answers['group_project_preference'] ?? ''),
            'interest_areas' => is_array($answers['interest_areas'] ?? null) ? $answers['interest_areas'] : [],
            'learning_style' => (string) ($answers['learning_style'] ?? ''),
            'personalized_bible_study_interest' => (string) ($answers['personalized_bible_study_interest'] ?? ''),
            'mission_social_projects_interest' => (string) ($answers['mission_social_projects_interest'] ?? ''),
            'start_area_preference' => (string) ($answers['start_area_preference'] ?? ''),
            'talents_for_god' => (string) ($answers['talents_for_god'] ?? ''),
            'team_support_notes' => (string) ($answers['team_support_notes'] ?? ''),
            'lgpd_consent' => (bool) ($answers['lgpd_consent'] ?? false),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function validationRulesForStep(
        string $step,
        array $input = [],
        ?MissionVolunteer $volunteer = null,
    ): array {
        $cfg = config('mission');
        $studiedBibleOptions = array_values(array_unique(array_merge(
            $cfg['studied_bible'] ?? [],
            ['Sim, complemente'],
        )));

        $rules = [
            'step' => ['required', 'string', Rule::in(self::STEP_ORDER)],
        ];

        $hasExistingPhoto = filled($volunteer?->photo_path);

        $stepRules = match ($step) {
            'photo' => [
                'photo' => [
                    $hasExistingPhoto ? 'nullable' : 'required',
                    'image',
                    'max:4096',
                ],
            ],
            'full_name' => [
                'full_name' => ['required', 'string', 'max:255'],
            ],
            'birth_date' => [
                'birth_date' => ['required', 'date', 'before:today'],
            ],
            'phone' => [
                'phone' => ['required', 'string', 'max:40'],
            ],
            'full_address' => [
                'full_address' => ['required', 'string', 'max:2000'],
            ],
            'profession' => [
                'profession' => ['required', 'string', Rule::in($cfg['professions'] ?? [])],
                'profession_other' => [
                    'nullable',
                    Rule::requiredIf(fn () => ($input['profession'] ?? null) === 'Outra'),
                    'string',
                    'max:120',
                ],
            ],
            'has_belief' => [
                'has_belief' => ['required', 'boolean'],
            ],
            'belief_which' => [
                'belief_which' => ['required', 'string', 'max:120'],
                'belief_which_other' => [
                    'nullable',
                    Rule::requiredIf(fn () => ($input['belief_which'] ?? null) === 'Outra'),
                    'string',
                    'max:120',
                ],
            ],
            'participates_religion' => [
                'participates_religion' => ['required', 'boolean'],
            ],
            'religion_which' => [
                'religion_which' => ['required', 'string', 'max:120'],
                'religion_which_other' => [
                    'nullable',
                    Rule::requiredIf(fn () => ($input['religion_which'] ?? null) === 'Outra'),
                    'string',
                    'max:120',
                ],
            ],
            'baptized' => [
                'baptized' => ['required', 'boolean'],
            ],
            'seeks_in_community' => [
                'seeks_in_community' => ['required', 'string', Rule::in($cfg['seeks_in_community'] ?? [])],
                'seeks_in_community_other' => [
                    'nullable',
                    Rule::requiredIf(fn () => ($input['seeks_in_community'] ?? null) === 'Outra'),
                    'string',
                    'max:120',
                ],
            ],
            'studied_bible' => [
                'studied_bible' => ['required', 'string', Rule::in($studiedBibleOptions)],
            ],
            'studied_bible_structured' => [
                'studied_bible_structured' => ['required', 'boolean'],
            ],
            'first_time_nova_semente' => [
                'first_time_nova_semente' => ['required', 'boolean'],
            ],
            'first_contact_via' => [
                'first_contact_via' => ['required', 'string', Rule::in($cfg['first_contact_via'] ?? [])],
                'first_contact_via_other' => [
                    'nullable',
                    Rule::requiredIf(fn () => ($input['first_contact_via'] ?? null) === 'Outra'),
                    'string',
                    'max:120',
                ],
            ],
            'wants_bible_study_partner' => [
                'wants_bible_study_partner' => ['required', 'string', Rule::in($cfg['wants_bible_study_partner'] ?? [])],
            ],
            'spiritual_journey' => [
                'spiritual_journey' => ['required', 'string', Rule::in($cfg['spiritual_journey'] ?? [])],
            ],
            'comfortable_environment' => [
                'comfortable_environment' => ['required', 'string', Rule::in($cfg['comfortable_environment'] ?? [])],
            ],
            'group_project_preference' => [
                'group_project_preference' => ['required', 'string', Rule::in($cfg['group_project_preference'] ?? [])],
            ],
            'interest_areas' => [
                'interest_areas' => ['required', 'array', 'min:1', 'max:3'],
                'interest_areas.*' => ['string', 'distinct', Rule::in($cfg['interest_areas'] ?? [])],
            ],
            'learning_style' => [
                'learning_style' => ['required', 'string', Rule::in($cfg['learning_style'] ?? [])],
            ],
            'personalized_bible_study_interest' => [
                'personalized_bible_study_interest' => ['required', 'string', Rule::in($cfg['personalized_bible_study_interest'] ?? [])],
            ],
            'mission_social_projects_interest' => [
                'mission_social_projects_interest' => ['required', 'string', Rule::in($cfg['mission_social_projects_interest'] ?? [])],
            ],
            'start_area_preference' => [
                'start_area_preference' => ['required', 'string', Rule::in($cfg['start_area_preference'] ?? [])],
            ],
            'talents_for_god' => [
                'talents_for_god' => ['nullable', 'string', 'max:2000'],
            ],
            'team_support_notes' => [
                'team_support_notes' => ['nullable', 'string', 'max:2000'],
            ],
            'lgpd_consent' => [
                'lgpd_consent' => ['accepted'],
            ],
            default => [],
        };

        return array_merge($rules, $stepRules);
    }

    /**
     * @param  array<string, mixed>  $valid
     */
    public static function applyStepToVolunteer(MissionVolunteer $volunteer, string $step, array $valid, ?UploadedFile $photo = null): void
    {
        $patch = match ($step) {
            'photo' => self::photoPatch($volunteer, $photo),
            'full_name' => ['full_name' => $valid['full_name']],
            'birth_date' => ['birth_date' => $valid['birth_date']],
            'phone' => ['phone' => $valid['phone']],
            'full_address' => ['full_address' => $valid['full_address']],
            'profession' => self::professionPatch($valid),
            'has_belief' => self::hasBeliefPatch($valid),
            'belief_which' => self::beliefWhichPatch($valid),
            'participates_religion' => self::participatesReligionPatch($valid),
            'religion_which' => self::religionWhichPatch($valid),
            'baptized' => ['baptized' => (bool) $valid['baptized']],
            'seeks_in_community' => self::seeksPatch($valid),
            'studied_bible' => ['studied_bible' => $valid['studied_bible']],
            'studied_bible_structured' => ['studied_bible_structured' => (bool) $valid['studied_bible_structured']],
            'first_time_nova_semente' => ['first_time_nova_semente' => (bool) $valid['first_time_nova_semente']],
            'first_contact_via' => self::firstContactPatch($valid),
            'wants_bible_study_partner' => ['wants_bible_study_partner' => $valid['wants_bible_study_partner']],
            'spiritual_journey' => ['spiritual_journey' => $valid['spiritual_journey']],
            'comfortable_environment' => ['comfortable_environment' => $valid['comfortable_environment']],
            'group_project_preference' => ['group_project_preference' => $valid['group_project_preference']],
            'interest_areas' => ['interest_areas' => array_values($valid['interest_areas'] ?? [])],
            'learning_style' => ['learning_style' => $valid['learning_style']],
            'personalized_bible_study_interest' => ['personalized_bible_study_interest' => $valid['personalized_bible_study_interest']],
            'mission_social_projects_interest' => ['mission_social_projects_interest' => $valid['mission_social_projects_interest']],
            'start_area_preference' => ['start_area_preference' => $valid['start_area_preference']],
            'talents_for_god' => ['talents_for_god' => self::trimNullable($valid['talents_for_god'] ?? null)],
            'team_support_notes' => ['team_support_notes' => self::trimNullable($valid['team_support_notes'] ?? null)],
            'lgpd_consent' => ['lgpd_consent' => true],
            default => [],
        };

        if ($patch !== []) {
            $volunteer->forceFill($patch)->save();
        }
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    public static function nextStepId(string $currentStep, array $answers): ?string
    {
        $visible = self::visibleSteps($answers);
        $index = array_search($currentStep, $visible, true);
        if ($index === false) {
            return $visible[0] ?? null;
        }

        return $visible[(int) $index + 1] ?? null;
    }

    /** @return array<string, mixed> */
    private static function photoPatch(MissionVolunteer $volunteer, ?UploadedFile $photo): array
    {
        if (! $photo instanceof UploadedFile) {
            return [];
        }

        if ($volunteer->photo_path) {
            Storage::disk('public')->delete($volunteer->photo_path);
        }

        return ['photo_path' => $photo->store('mission/volunteers', 'public')];
    }

    /** @param  array<string, mixed>  $valid */
    private static function professionPatch(array $valid): array
    {
        $resolved = self::resolveChoiceWithOther(
            (string) ($valid['profession'] ?? ''),
            $valid['profession_other'] ?? null,
        );

        return [
            'profession' => $resolved['value'],
            'profession_other' => $resolved['other'],
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function hasBeliefPatch(array $valid): array
    {
        if ((bool) $valid['has_belief']) {
            return ['has_belief' => true];
        }

        return [
            'has_belief' => false,
            'belief_which' => null,
            'belief_which_other' => null,
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function beliefWhichPatch(array $valid): array
    {
        $resolved = self::resolveChoiceWithOther(
            (string) ($valid['belief_which'] ?? ''),
            $valid['belief_which_other'] ?? null,
        );

        return [
            'belief_which' => $resolved['value'],
            'belief_which_other' => $resolved['other'],
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function participatesReligionPatch(array $valid): array
    {
        if ((bool) $valid['participates_religion']) {
            return ['participates_religion' => true];
        }

        return [
            'participates_religion' => false,
            'religion_which' => null,
            'religion_which_other' => null,
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function religionWhichPatch(array $valid): array
    {
        $resolved = self::resolveChoiceWithOther(
            (string) ($valid['religion_which'] ?? ''),
            $valid['religion_which_other'] ?? null,
        );

        return [
            'religion_which' => $resolved['value'],
            'religion_which_other' => $resolved['other'],
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function seeksPatch(array $valid): array
    {
        $choice = (string) ($valid['seeks_in_community'] ?? '');
        if ($choice === 'Outra') {
            return [
                'seeks_in_community' => ['Outra'],
                'seeks_in_community_other' => self::trimNullable($valid['seeks_in_community_other'] ?? null),
            ];
        }

        return [
            'seeks_in_community' => $choice !== '' ? [$choice] : [],
            'seeks_in_community_other' => null,
        ];
    }

    /** @param  array<string, mixed>  $valid */
    private static function firstContactPatch(array $valid): array
    {
        $resolved = self::resolveChoiceWithOther(
            (string) ($valid['first_contact_via'] ?? ''),
            $valid['first_contact_via_other'] ?? null,
        );

        return [
            'first_contact_via' => $resolved['value'],
            'first_contact_via_other' => $resolved['other'],
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

    private static function trimNullable(mixed $value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text !== '' ? $text : null;
    }
}
