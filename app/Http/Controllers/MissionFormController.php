<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMissionVolunteerRequest;
use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Actions\Mission\RecordMissionVolunteerPhaseChange;
use App\Actions\Mission\SendMissionVolunteerInstructions;
use App\Support\MissionAppAccount;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionVolunteerInstructions;
use App\Support\MissionVolunteerPayload;
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

    public function create(Request $request): Response
    {
        $churchId = $this->churchId($request);
        $church = $churchId ? Church::query()->find($churchId) : null;

        $isMobile = $request->routeIs('mobile.mission.form');

        $missionOptions = config('mission');

        return Inertia::render($isMobile ? 'Mobile/Mission' : 'Mission/Form', [
            'churchName' => $church?->name ?? config('app.name'),
            'options' => [
                'professions' => $missionOptions['professions'] ?? [],
                'beliefs' => $missionOptions['beliefs'] ?? [],
                'religions' => $missionOptions['religions'] ?? [],
                'seeks_in_community' => $missionOptions['seeks_in_community'] ?? [],
                'studied_bible' => $missionOptions['studied_bible'] ?? [],
                'first_contact_via' => $missionOptions['first_contact_via'] ?? [],
                'wants_bible_study_partner' => $missionOptions['wants_bible_study_partner'] ?? [],
            ],
            'formRevision' => 12,
            'storeUrl' => $isMobile ? route('mobile.mission.store') : route('mission.store'),
            'appAccountStoreUrl' => $isMobile ? route('mobile.mission.app-account.store') : route('mission.app-account.store'),
            'layout' => $isMobile ? 'mobile' : 'default',
            'submission' => $request->session()->get('mission_submission'),
        ]);
    }

    public function store(StoreMissionVolunteerRequest $request): RedirectResponse
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $valid = $request->validated();
        $phaseId = MissionPhaseBootstrap::defaultPhaseIdForChurch((int) $churchId);

        /** @var UploadedFile $photoFile */
        $photoFile = $request->file('photo');
        $photoPath = $photoFile->store('mission/volunteers', 'public');

        $volunteer = MissionVolunteer::create(array_merge(
            MissionVolunteerPayload::toModelAttributes($valid, $photoPath),
            [
                'church_id' => $churchId,
                'mission_phase_id' => $phaseId,
                'phase_entered_at' => now(),
                'submitted_by_user_id' => $request->user()?->id,
            ],
        ));

        app(RecordMissionVolunteerPhaseChange::class)(
            $volunteer,
            null,
            $phaseId !== null ? (int) $phaseId : null,
            $request->user(),
        );

        $instructionsEmailSent = app(SendMissionVolunteerInstructions::class)($volunteer);

        $appStatus = MissionAppAccount::statusForPhone(
            (int) $churchId,
            (string) $volunteer->phone,
            $request->user(),
        );

        $redirectRoute = $request->routeIs('mobile.mission.store') ? 'mobile.mission.form' : 'mission.form';

        $firstName = trim(explode(' ', (string) $volunteer->full_name)[0] ?? '');
        $nameFragment = $firstName !== '' ? ", {$firstName}," : '';

        $submission = array_merge(
            MissionAppAccount::submissionPayload($volunteer, $appStatus['already_in_app'], $appStatus['reason']),
            [
                'message' => sprintf(
                    'Parabéns%s seu cadastro foi realizado e estamos muito felizes por ter você aqui. Você está na fase de Acolhimento. Isso significa que, em breve, alguém do nosso time entrará em contato para apresentar o próximo passo e te ajudar a encontrar a melhor forma de atuar.',
                    $nameFragment
                ),
                'instructions' => MissionVolunteerInstructions::lines(),
                'instructionsEmailSent' => $instructionsEmailSent,
                'instructionsEmail' => $volunteer->fresh()?->display_email,
            ],
        );

        if (! $appStatus['already_in_app']) {
            $request->session()->put(
                'mission_pending_app_registration',
                MissionAppAccount::pendingSession($volunteer, (int) $churchId),
            );
        }

        return redirect()
            ->route($redirectRoute)
            ->with('mission_submission', $submission)
            ->with('success', $submission['message']);
    }
}
