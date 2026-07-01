<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Services\SunsetMeditationPdfService;
use App\Support\ChurchAppFeatures;
use App\Support\SolicitationHandlerAssignee;
use App\Support\SpatiePermissionCheck;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);
        $user = $request->user();
        $isSuperAdmin = $user?->hasRole('super_admin') ?? false;
        $canEditLibraryUrls = $isSuperAdmin || ($user !== null && SpatiePermissionCheck::userHas($user, 'library.manage'));
        $canEditTreasurerEmail = $isSuperAdmin
            || ($user !== null && ($user->hasAnyRole(['admin']) || SpatiePermissionCheck::userHas($user, 'campaigns.manage') || SpatiePermissionCheck::userHas($user, 'finance.view')));
        $canEditTalentsModeratorEmail = $isSuperAdmin
            || ($user !== null && ($user->hasAnyRole(['admin']) || SpatiePermissionCheck::userHas($user, 'talents.moderate')));

        return Inertia::render('Settings/Index', [
            'churchName' => $church->name,
            'canEditSolicitationsHandler' => $isSuperAdmin,
            'canEditYoutubeLive' => $isSuperAdmin,
            'canEditLibraryUrls' => $canEditLibraryUrls,
            'solicitationsHandlerVolunteerId' => $church->solicitations_handler_volunteer_id,
            'solicitationsHandlerOptions' => SolicitationHandlerAssignee::volunteerOptionsForChurch($churchId),
            'updateSolicitationsHandlerUrl' => route('settings.solicitations-handler.update'),
            'youtubeLiveUrl' => $church->youtube_live_url,
            'updateYoutubeLiveUrl' => route('settings.youtube-live.update'),
            'libraryMeditationUrl' => $church->library_meditation_url,
            'libraryLessonUrl' => $church->library_lesson_url,
            'updateLibraryMeditationUrl' => route('settings.library-meditation.update'),
            'updateLibraryLessonUrl' => route('settings.library-lesson.update'),
            'librarySunsetMeditationPdfUrl' => $church->resolvedLibrarySunsetMeditationPdfUrl(),
            'librarySunsetMeditationSegmentCount' => is_array($church->library_sunset_meditation_segments)
                ? count($church->library_sunset_meditation_segments)
                : 0,
            'librarySunsetMeditationYear' => $church->library_sunset_meditation_year,
            'updateLibrarySunsetMeditationUrl' => route('settings.library-sunset-meditation.update'),
            'canEditTreasurerEmail' => $canEditTreasurerEmail,
            'treasurerNotificationEmail' => $church->treasurer_notification_email,
            'updateTreasurerEmailUrl' => route('settings.treasurer-email.update'),
            'canEditTalentsModeratorEmail' => $canEditTalentsModeratorEmail,
            'talentsModeratorNotificationEmail' => $church->talents_moderator_notification_email,
            'updateTalentsModeratorEmailUrl' => route('settings.talents-moderator-email.update'),
        ]);
    }

    public function updateTreasurerEmail(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'treasurer_notification_email' => ['nullable', 'email', 'max:255'],
        ]);
        $raw = trim((string) ($validated['treasurer_notification_email'] ?? ''));
        $church->update([
            'treasurer_notification_email' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->route('settings.index')->with('success', 'E-mail do tesoureiro para doações atualizado.');
    }

    public function updateTalentsModeratorEmail(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'talents_moderator_notification_email' => ['nullable', 'email', 'max:255'],
        ]);
        $raw = trim((string) ($validated['talents_moderator_notification_email'] ?? ''));
        $church->update([
            'talents_moderator_notification_email' => $raw !== '' ? $raw : null,
        ]);

        return redirect()->route('settings.index')->with('success', 'E-mail do aprovador da Central de Serviços atualizado.');
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

    public function updateLibrarySunsetMeditationPdf(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'library_sunset_meditation_pdf_file' => ['required', 'file', 'mimes:pdf', 'max:12288'],
            'library_sunset_meditation_year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ], [
            'library_sunset_meditation_pdf_file.required' => 'Envie o arquivo PDF.',
            'library_sunset_meditation_pdf_file.uploaded' => 'O PDF não chegou ao servidor por completo. Revise limites de upload no Nginx e PHP.',
        ]);

        $year = isset($validated['library_sunset_meditation_year'])
            ? (int) $validated['library_sunset_meditation_year']
            : null;

        $storedPath = $request->file('library_sunset_meditation_pdf_file')->store(
            'library/sunset-meditation/'.$churchId,
            'public'
        );

        /** @var SunsetMeditationPdfService $svc */
        $svc = app(SunsetMeditationPdfService::class);
        $parsed = $svc->parseStoredPdf($storedPath, $year);
        if (empty($parsed['ok'])) {
            Storage::disk('public')->delete($storedPath);

            return back()->withErrors([
                'library_sunset_meditation_pdf_file' => $parsed['error'] ?? 'Não foi possível processar o PDF.',
            ]);
        }

        $previousPath = trim((string) ($church->library_sunset_meditation_pdf_path ?? ''));
        if ($previousPath !== '' && $previousPath !== $storedPath) {
            Storage::disk('public')->delete($previousPath);
        }

        $church->update([
            'library_sunset_meditation_pdf_path' => $storedPath,
            'library_sunset_meditation_segments' => $parsed['segments'] ?? [],
            'library_sunset_meditation_year' => $parsed['year'] ?? $year ?? (int) now()->format('Y'),
        ]);

        $count = is_array($parsed['segments']) ? count($parsed['segments']) : 0;

        return redirect()->route('settings.index')->with(
            'success',
            'Meditação Por do Sol publicada com '.$count.' meditações semanais.'
        );
    }

    public function appFeatures(Request $request): Response
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        return Inertia::render('Settings/AppFeatures', [
            'churchName' => $church->name,
            'groups' => ChurchAppFeatures::groupedFeaturesForAdmin($church),
            'updateUrl' => route('settings.app-features.update'),
        ]);
    }

    public function updateAppFeatures(Request $request): RedirectResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $church = Church::query()->findOrFail($churchId);

        $validated = $request->validate([
            'enabled_features' => ['present', 'array'],
            'enabled_features.*' => ['string'],
            'form_feature_keys' => ['sometimes', 'array'],
            'form_feature_keys.*' => ['string'],
        ]);

        $definitions = ChurchAppFeatures::definitions();

        $enabled = array_values(array_filter(
            $validated['enabled_features'],
            fn ($key) => is_string($key) && array_key_exists($key, $definitions),
        ));

        $formKeys = array_values(array_filter(
            $validated['form_feature_keys'] ?? ChurchAppFeatures::allKeys(),
            fn ($key) => is_string($key) && array_key_exists($key, $definitions),
        ));

        ChurchAppFeatures::syncEnabledKeys($church, $enabled, $formKeys);

        return redirect()
            ->route('settings.app-features.index')
            ->with('success', 'Funcionalidades do app atualizadas.');
    }
}
