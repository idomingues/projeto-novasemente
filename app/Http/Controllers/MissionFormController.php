<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Support\MissionPhaseBootstrap;
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

        $isMobile = $request->routeIs('mobile.mission');

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
            'formRevision' => 11,
            'storeUrl' => $isMobile ? route('mobile.mission.store') : route('mission.store'),
            'layout' => $isMobile ? 'mobile' : 'default',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $valid = $request->validate(MissionVolunteerPayload::validationRules());
        $phaseId = MissionPhaseBootstrap::defaultPhaseIdForChurch((int) $churchId);

        /** @var UploadedFile $photoFile */
        $photoFile = $request->file('photo');
        $photoPath = $photoFile->store('mission/volunteers', 'public');

        MissionVolunteer::create(array_merge(
            MissionVolunteerPayload::toModelAttributes($valid, $photoPath),
            [
                'church_id' => $churchId,
                'mission_phase_id' => $phaseId,
                'submitted_by_user_id' => $request->user()?->id,
            ],
        ));

        $redirectRoute = $request->routeIs('mobile.mission.store') ? 'mobile.mission' : 'mission.form';

        return redirect()
            ->route($redirectRoute)
            ->with('success', 'Cadastro enviado com sucesso! Nossa equipe entrará em contato em breve.');
    }
}
