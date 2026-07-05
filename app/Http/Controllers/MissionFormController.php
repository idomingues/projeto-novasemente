<?php

namespace App\Http\Controllers;

use App\Actions\Mission\CompleteMissionVolunteerRegistration;
use App\Actions\Mission\RecordMissionVolunteerPhaseChange;
use App\Actions\Mission\SendMissionVolunteerInstructions;
use App\Http\Requests\StoreMissionVolunteerRequest;
use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Support\MissionAppAccount;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionVolunteerInstructions;
use App\Support\MissionVolunteerPayload;
use App\Support\MissionVolunteerRegistration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;

class MissionFormController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function isMobileRoute(Request $request): bool
    {
        return $request->routeIs('mobile.mission.form')
            || $request->routeIs('mobile.mission.store')
            || $request->routeIs('mobile.mission.step');
    }

    private function formRoute(Request $request): string
    {
        return $this->isMobileRoute($request) ? 'mobile.mission.form' : 'mission.form';
    }

    private function appHomeRoute(Request $request): string
    {
        return 'mobile.home';
    }

    /** @return array<string, mixed> */
    private function missionOptions(): array
    {
        $missionOptions = config('mission');

        return [
            'professions' => $missionOptions['professions'] ?? [],
            'beliefs' => $missionOptions['beliefs'] ?? [],
            'religions' => $missionOptions['religions'] ?? [],
            'seeks_in_community' => $missionOptions['seeks_in_community'] ?? [],
            'studied_bible' => $missionOptions['studied_bible'] ?? [],
            'first_contact_via' => $missionOptions['first_contact_via'] ?? [],
            'wants_bible_study_partner' => $missionOptions['wants_bible_study_partner'] ?? [],
            'spiritual_journey' => $missionOptions['spiritual_journey'] ?? [],
            'comfortable_environment' => $missionOptions['comfortable_environment'] ?? [],
            'group_project_preference' => $missionOptions['group_project_preference'] ?? [],
            'interest_areas' => $missionOptions['interest_areas'] ?? [],
            'learning_style' => $missionOptions['learning_style'] ?? [],
            'personalized_bible_study_interest' => $missionOptions['personalized_bible_study_interest'] ?? [],
            'mission_social_projects_interest' => $missionOptions['mission_social_projects_interest'] ?? [],
            'start_area_preference' => $missionOptions['start_area_preference'] ?? [],
        ];
    }

    public function create(Request $request): Response
    {
        $churchId = $this->churchId($request);
        $church = $churchId ? Church::query()->find($churchId) : null;
        $user = $request->user();
        $isMobile = $request->routeIs('mobile.mission.form');

        $draft = null;
        $canResume = false;
        $isEditing = false;
        if ($user && $churchId) {
            $completed = MissionVolunteerRegistration::findCompletedForUser((int) $churchId, $user);
            if ($completed !== null) {
                $draft = MissionVolunteerRegistration::draftPayload($completed);
                $isEditing = true;
            } else {
                $draftModel = MissionVolunteerRegistration::findDraftForUser((int) $churchId, $user);
                $draft = MissionVolunteerRegistration::draftPayload($draftModel);
                $canResume = $draft !== null;
            }
        }

        return Inertia::render($isMobile ? 'Mobile/Mission' : 'Mission/Form', [
            'churchName' => $church?->name ?? config('app.name'),
            'options' => $this->missionOptions(),
            'formRevision' => 14,
            'storeUrl' => $isMobile ? route('mobile.mission.store') : route('mission.store'),
            'saveStepUrl' => $isMobile ? route('mobile.mission.step') : route('mission.step'),
            'appAccountStoreUrl' => $isMobile ? route('mobile.mission.app-account.store') : route('mission.app-account.store'),
            'layout' => $isMobile ? 'mobile' : 'default',
            'submission' => $request->session()->get('mission_submission'),
            'canResume' => $canResume,
            'isEditing' => $isEditing,
            'draft' => $draft,
            'offerAppAccount' => $user === null,
        ]);
    }

    public function saveStep(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $this->mergeBooleanInputs($request);

        if ($request->has('lgpd_consent')) {
            $lgpd = $request->input('lgpd_consent');
            if (in_array($lgpd, [true, 1, '1', 'true', 'on', 'yes'], true)) {
                $request->merge(['lgpd_consent' => true]);
            }
        }

        $registration = MissionVolunteerRegistration::findRegistrationForUser((int) $churchId, $user);

        $step = (string) $request->input('step', '');
        $valid = validator(
            $request->all(),
            MissionVolunteerRegistration::validationRulesForStep($step, $request->all(), $registration),
            [
                'profession_other.required' => 'Especifique sua profissão.',
                'belief_which_other.required' => 'Especifique sua crença.',
                'religion_which_other.required' => 'Especifique a religião.',
                'seeks_in_community_other.required' => 'Especifique o que busca na comunidade.',
                'first_contact_via_other.required' => 'Especifique como foi o contato.',
                'lgpd_consent.accepted' => 'Aceite o uso dos dados (LGPD) para enviar.',
            ],
        )->validate();

        if ($registration === null) {
            $registration = MissionVolunteer::create([
                'church_id' => $churchId,
                'submitted_by_user_id' => $user->id,
            ]);
        }

        $wasCompleted = $registration->registration_completed_at !== null;

        /** @var UploadedFile|null $photo */
        $photo = $request->file('photo');
        MissionVolunteerRegistration::applyStepToVolunteer($registration, $step, $valid, $photo);

        $registration = $registration->fresh();
        abort_unless($registration instanceof MissionVolunteer, 500);

        $answers = MissionVolunteerRegistration::answersFromVolunteer($registration);
        $nextStep = MissionVolunteerRegistration::nextStepId($step, $answers) ?? $step;
        $registration->forceFill(['registration_step' => $nextStep])->save();

        if ($step === 'lgpd_consent') {
            if ($wasCompleted) {
                $registration->forceFill(['registration_step' => null])->save();

                return redirect()
                    ->route($this->formRoute($request))
                    ->with('success', 'Cadastro atualizado com sucesso.');
            }

            $submission = app(CompleteMissionVolunteerRegistration::class)($registration->fresh(), $request);

            return redirect()
                ->route($this->formRoute($request))
                ->with('mission_submission', $submission)
                ->with('success', $submission['message']);
        }

        return redirect()
            ->route($this->formRoute($request))
            ->with('success', $wasCompleted ? 'Alteração salva.' : 'Resposta salva. Você pode continuar depois.');
    }

    public function store(StoreMissionVolunteerRequest $request): RedirectResponse
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $existing = $user
            ? MissionVolunteerRegistration::findRegistrationForUser((int) $churchId, $user)
            : null;

        if ($existing !== null && $existing->registration_completed_at !== null) {
            $valid = $request->validated();

            $photoPath = $existing->photo_path;
            if ($request->hasFile('photo')) {
                if ($existing->photo_path) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($existing->photo_path);
                }
                /** @var UploadedFile $photoFile */
                $photoFile = $request->file('photo');
                $photoPath = $photoFile->store('mission/volunteers', 'public');
            }

            $existing->forceFill(array_merge(
                MissionVolunteerPayload::toModelAttributes($valid, (string) $photoPath),
                [
                    'submitted_by_user_id' => $user->id,
                    'registration_step' => null,
                ],
            ))->save();

            return redirect()
                ->route($this->formRoute($request))
                ->with('success', 'Cadastro atualizado com sucesso.');
        }

        $valid = $request->validated();
        $phaseId = MissionPhaseBootstrap::defaultPhaseIdForChurch((int) $churchId);

        /** @var UploadedFile $photoFile */
        $photoFile = $request->file('photo');
        $photoPath = $photoFile->store('mission/volunteers', 'public');

        $draft = $user
            ? MissionVolunteerRegistration::findDraftForUser((int) $churchId, $user)
            : null;

        if ($draft !== null) {
            if ($draft->photo_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($draft->photo_path);
            }
            $volunteer = $draft;
            $volunteer->forceFill(array_merge(
                MissionVolunteerPayload::toModelAttributes($valid, $photoPath),
                [
                    'mission_phase_id' => $phaseId,
                    'phase_entered_at' => now(),
                    'submitted_by_user_id' => $user->id,
                    'registration_completed_at' => now(),
                    'registration_step' => null,
                ],
            ))->save();
        } else {
            $volunteer = MissionVolunteer::create(array_merge(
                MissionVolunteerPayload::toModelAttributes($valid, $photoPath),
                [
                    'church_id' => $churchId,
                    'mission_phase_id' => $phaseId,
                    'phase_entered_at' => now(),
                    'submitted_by_user_id' => $user?->id,
                    'registration_completed_at' => now(),
                ],
            ));
        }

        app(RecordMissionVolunteerPhaseChange::class)(
            $volunteer,
            null,
            $phaseId !== null ? (int) $phaseId : null,
            $request->user(),
        );

        $instructionsEmailSent = app(SendMissionVolunteerInstructions::class)($volunteer);

        $wantsAppAccount = $user === null && $request->has('wants_app_account')
            ? $request->boolean('wants_app_account')
            : null;

        $appResolution = MissionAppAccount::resolveWizardAppAccount(
            $volunteer->fresh(),
            $request,
            offerAppAccount: $user === null,
            wantsAppAccount: $wantsAppAccount,
            appEmail: $request->input('app_email'),
            appPassword: $request->input('app_password'),
        );

        if ($appResolution['app_account_created'] && $appResolution['app_email']) {
            $instructionsEmailSent = app(SendMissionVolunteerInstructions::class)($volunteer->fresh());
        }

        $firstName = trim(explode(' ', (string) $volunteer->full_name)[0] ?? '');
        $nameFragment = $firstName !== '' ? ", {$firstName}," : '';

        $alreadyInApp = $appResolution['already_in_app'] || $appResolution['app_account_created'];
        $message = $appResolution['app_account_created']
            ? sprintf(
                'Parabéns%s seu cadastro missionário foi realizado e sua conta no app foi criada.',
                $nameFragment,
            )
            : ($wantsAppAccount === false
                ? sprintf(
                    'Parabéns%s seu cadastro missionário foi realizado. Nossa equipe entrará em contato em breve.',
                    $nameFragment,
                )
                : sprintf(
                    'Parabéns%s seu cadastro foi realizado e estamos muito felizes por ter você aqui. Você está na fase de Acolhimento. Isso significa que, em breve, alguém do nosso time entrará em contato para apresentar o próximo passo e te ajudar a encontrar a melhor forma de atuar.',
                    $nameFragment,
                ));

        $submission = array_merge(
            MissionAppAccount::submissionPayload(
                $volunteer,
                $alreadyInApp,
                $appResolution['reason'],
                $appResolution['app_account_created'],
                $appResolution['app_account_resolved'],
            ),
            [
                'message' => $message,
                'instructions' => MissionVolunteerInstructions::lines(),
                'instructionsEmailSent' => $instructionsEmailSent,
                'instructionsEmail' => $appResolution['app_email'] ?? $volunteer->fresh()?->display_email,
            ],
        );

        MissionAppAccount::syncPendingSession(
            $request,
            $volunteer,
            $alreadyInApp,
            $appResolution['app_account_created'],
            $appResolution['app_account_resolved'],
        );

        if ($appResolution['app_account_created']) {
            $request->session()->flash('registration_success', true);

            return redirect()
                ->route($this->appHomeRoute($request))
                ->with('success', $message);
        }

        return redirect()
            ->route($this->formRoute($request))
            ->with('mission_submission', $submission)
            ->with('success', $submission['message']);
    }

    private function mergeBooleanInputs(Request $request): void
    {
        $booleanFields = [
            'has_belief',
            'participates_religion',
            'baptized',
            'studied_bible_structured',
            'first_time_nova_semente',
        ];

        $merged = [];
        foreach ($booleanFields as $field) {
            if (! $request->has($field)) {
                continue;
            }
            $value = $request->input($field);
            if ($value === '' || $value === null) {
                continue;
            }
            $merged[$field] = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $value;
        }

        if ($merged !== []) {
            $request->merge($merged);
        }
    }
}
