<?php

namespace App\Http\Controllers;

use App\Actions\Mission\SendMissionVolunteerInstructions;
use App\Support\MissionAppAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MissionAppAccountController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $volunteer = MissionAppAccount::consumePending($request);
        if ($volunteer === null) {
            return $this->redirectToForm($request)
                ->with('error', 'Não foi possível concluir o cadastro no app. Envie o formulário Missão novamente.');
        }

        $appStatus = MissionAppAccount::statusForRegistration(
            (int) $volunteer->church_id,
            (string) $volunteer->phone,
            null,
            $request->user(),
        );

        if ($appStatus['already_in_app']) {
            MissionAppAccount::clearPending($request);

            return $this->redirectToForm($request)->with('mission_submission', array_merge(
                MissionAppAccount::submissionPayload($volunteer, true, $appStatus['reason'], appAccountResolved: true),
                ['message' => 'Cadastro missionário enviado com sucesso! Você já possui conta no aplicativo.'],
            ));
        }

        $valid = $request->validate(MissionAppAccount::validationRules());

        MissionAppAccount::createFromVolunteer(
            $volunteer,
            $valid['email'],
            $valid['password'],
            $request,
        );

        MissionAppAccount::clearPending($request);

        app(SendMissionVolunteerInstructions::class)($volunteer->fresh());

        $request->session()->flash('registration_success', true);

        return redirect()
            ->route('mobile.home')
            ->with('success', 'Cadastro missionário enviado e conta no app criada com sucesso! Você já pode usar o aplicativo.');
    }

    private function redirectToForm(Request $request): RedirectResponse
    {
        $route = $request->routeIs('mobile.mission.app-account.store') ? 'mobile.mission.form' : 'mission.form';

        return redirect()->route($route);
    }
}
