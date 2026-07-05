<?php

namespace App\Actions\Mission;

use App\Models\MissionVolunteer;
use App\Support\MissionAppAccount;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionVolunteerInstructions;
use Illuminate\Http\Request;

final class CompleteMissionVolunteerRegistration
{
    public function __invoke(MissionVolunteer $volunteer, Request $request): array
    {
        $churchId = (int) $volunteer->church_id;
        $phaseId = MissionPhaseBootstrap::defaultPhaseIdForChurch($churchId);

        $volunteer->forceFill([
            'mission_phase_id' => $phaseId,
            'phase_entered_at' => now(),
            'registration_completed_at' => now(),
            'registration_step' => null,
        ])->save();

        app(RecordMissionVolunteerPhaseChange::class)(
            $volunteer,
            null,
            $phaseId !== null ? (int) $phaseId : null,
            $request->user(),
        );

        $instructionsEmailSent = app(SendMissionVolunteerInstructions::class)($volunteer);

        $appStatus = MissionAppAccount::statusForRegistration(
            $churchId,
            (string) $volunteer->phone,
            null,
            $request->user(),
        );

        $firstName = trim(explode(' ', (string) $volunteer->full_name)[0] ?? '');
        $nameFragment = $firstName !== '' ? ", {$firstName}," : '';

        $submission = array_merge(
            MissionAppAccount::submissionPayload(
                $volunteer,
                $appStatus['already_in_app'],
                $appStatus['reason'],
                false,
                $appStatus['already_in_app'],
            ),
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

        MissionAppAccount::syncPendingSession(
            $request,
            $volunteer,
            $appStatus['already_in_app'],
            false,
            false,
        );

        return $submission;
    }
}
