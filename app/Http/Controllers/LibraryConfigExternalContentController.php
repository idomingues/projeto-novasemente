<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Services\LibraryExternalPageExtractService;
use App\Services\SunsetMeditationPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LibraryConfigExternalContentController extends Controller
{
    public function show(Request $request, string $type): JsonResponse
    {
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $church = Church::query()->findOrFail($churchId);

        $type = trim(strtolower($type));

        if ($type === 'sunset_meditation') {
            return $this->sunsetMeditationResponse($church);
        }

        $url = match ($type) {
            'meditation' => $church->resolvedLibraryMeditationUrl(),
            'lesson' => $church->resolvedLibraryLessonUrl(),
            default => '',
        };

        $url = trim($url);
        if ($url === '') {
            return response()->json(['ok' => false, 'error' => 'Link não configurado.'], 422);
        }

        /** @var LibraryExternalPageExtractService $svc */
        $svc = app(LibraryExternalPageExtractService::class);
        $result = $svc->fetchAndExtract($url, $type);

        if (empty($result['ok'])) {
            return response()->json([
                'ok' => false,
                'error' => $result['error'] ?? 'Não foi possível obter o conteúdo.',
            ]);
        }

        $html = (string) ($result['html'] ?? '');
        $segments = isset($result['segments']) && is_array($result['segments']) ? $result['segments'] : null;
        if ($segments === null && $type === 'lesson') {
            $split = $svc->segmentLessonHtmlByWeekday($html);
            if (count($split) > 1) {
                $segments = $split;
            }
        }

        return response()->json([
            'ok' => true,
            'html' => $html,
            'segments' => $segments,
            'source_url' => $url,
        ]);
    }

    private function sunsetMeditationResponse(Church $church): JsonResponse
    {
        if (! $church->hasLibrarySunsetMeditation()) {
            return response()->json(['ok' => false, 'error' => 'PDF não configurado.'], 422);
        }

        $segments = $church->library_sunset_meditation_segments;
        if (! is_array($segments) || $segments === []) {
            return response()->json(['ok' => false, 'error' => 'Meditações indisponíveis. Envie o PDF novamente em Configurações.'], 422);
        }

        /** @var SunsetMeditationPdfService $svc */
        $svc = app(SunsetMeditationPdfService::class);
        $defaultIndex = $svc->resolveDefaultIndex($segments);
        $html = (string) ($segments[$defaultIndex]['html'] ?? '');

        return response()->json([
            'ok' => true,
            'html' => $html,
            'segments' => $segments,
            'default_index' => $defaultIndex,
            'source_url' => $church->resolvedLibrarySunsetMeditationPdfUrl(),
        ]);
    }
}
