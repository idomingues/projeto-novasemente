<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\MissionVolunteer;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionVolunteerPayload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return Inertia::render($isMobile ? 'Mobile/Mission' : 'Mission/Form', [
            'churchName' => $church?->name ?? config('app.name'),
            'options' => config('mission'),
            'storeUrl' => $isMobile ? route('mobile.mission.store') : route('mission.store'),
            'layout' => $isMobile ? 'mobile' : 'default',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $valid = $request->validate(MissionVolunteerPayload::validationRules());
        $photoPath = MissionVolunteerPayload::storePhoto($request);
        $phaseId = MissionPhaseBootstrap::defaultPhaseIdForChurch((int) $churchId);

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
