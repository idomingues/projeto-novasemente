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
            'churchName' => $church->name,
            'solicitationsHandlerVolunteerId' => $church->solicitations_handler_volunteer_id,
            'solicitationsHandlerOptions' => SolicitationHandlerAssignee::volunteerOptionsForChurch($churchId),
            'updateSolicitationsHandlerUrl' => route('settings.solicitations-handler.update'),
            'youtubeLiveUrl' => $church->youtube_live_url,
            'updateYoutubeLiveUrl' => route('settings.youtube-live.update'),
            'libraryMeditationUrl' => $church->library_meditation_url,
            'libraryLessonUrl' => $church->library_lesson_url,
            'updateLibraryMeditationUrl' => route('settings.library-meditation.update'),
            'updateLibraryLessonUrl' => route('settings.library-lesson.update'),
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

    public function updateYoutubeLive(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'youtube_live_url' => ['nullable', 'string', 'max:512'],
        ]);
        $raw = trim((string) ($validated['youtube_live_url'] ?? ''));
        $church->update([
            'youtube_live_url' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->route('settings.index')->with('success', 'Link do culto ao vivo atualizado.');
    }

    public function updateLibraryMeditationUrl(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'library_meditation_url' => ['nullable', 'string', 'max:2048', 'active_url'],
        ]);
        $raw = trim((string) ($validated['library_meditation_url'] ?? ''));
        $church->update([
            'library_meditation_url' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->route('settings.index')->with('success', 'Link da meditação atualizado.');
    }

    public function updateLibraryLessonUrl(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'library_lesson_url' => ['nullable', 'string', 'max:2048', 'active_url'],
        ]);
        $raw = trim((string) ($validated['library_lesson_url'] ?? ''));
        $church->update([
            'library_lesson_url' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->route('settings.index')->with('success', 'Link da lição atualizado.');
    }
}
