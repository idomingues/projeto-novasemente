<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Support\SolicitationHandlerAssignee;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        return Inertia::render('Settings/Index', [
            'solicitationsHandlerVolunteerId' => $church->solicitations_handler_volunteer_id,
            'solicitationsHandlerOptions' => SolicitationHandlerAssignee::volunteerOptionsForChurch($churchId),
            'updateSolicitationsHandlerUrl' => route('settings.solicitations-handler.update'),
        ]);
    }

    public function updateSolicitationsHandler(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $request->validate([
            'solicitations_handler_volunteer_id' => ['present'],
        ]);

        $raw = $request->input('solicitations_handler_volunteer_id');
        if ($raw === null || $raw === '') {
            $vid = null;
        } elseif (is_numeric($raw)) {
            $vid = (int) $raw;
        } else {
            return back()->withErrors([
                'solicitations_handler_volunteer_id' => 'Valor inválido.',
            ]);
        }

        if ($vid !== null && ! SolicitationHandlerAssignee::isValidHandlerVolunteer($vid, $churchId)) {
            return back()->withErrors([
                'solicitations_handler_volunteer_id' => 'Escolha um líder de ministério com conta e serviço nesta igreja.',
            ]);
        }

        $church->solicitations_handler_volunteer_id = $vid;
        $church->save();

        return redirect()->route('settings.index')->with('success', 'Responsável pelas solicitações atualizado.');
    }
}
