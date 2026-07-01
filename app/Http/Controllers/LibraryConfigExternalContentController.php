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

        $defaultIndex = null;
        if ($type === 'lesson' && is_array($segments) && count($segments) > 1) {
            $defaultIndex = $this->resolveLessonDefaultIndex($segments);
        }

        return response()->json([
            'ok' => true,
            'html' => $html,
            'segments' => $segments,
            'source_url' => $url,
            'default_index' => $defaultIndex,
        ]);
    }

    /**
     * @param  list<array{slug: string, label: string, html: string}>  $segments
     */
    private function resolveLessonDefaultIndex(array $segments): int
    {
        $todaySlug = match ((int) now()->dayOfWeek) {
            6 => 'sabado',
            0 => 'domingo',
            1 => 'segunda',
            2 => 'terca',
            3 => 'quarta',
            4 => 'quinta',
            5 => 'sexta',
            default => 'sabado',
        };

        foreach ($segments as $index => $segment) {
            $slug = (string) ($segment['slug'] ?? '');
            if ($slug === $todaySlug || str_starts_with($slug, $todaySlug.'-')) {
                return $index;
            }
        }

        return 0;
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
        $visible = $svc->resolveVisibleSegments($segments);
        $visibleSegments = $visible['segments'];
        $defaultIndex = $visible['default_index'];
        $html = (string) ($visibleSegments[$defaultIndex]['html'] ?? '');

        return response()->json([
            'ok' => true,
            'html' => $html,
            'segments' => $visibleSegments,
            'default_index' => $defaultIndex,
            'source_url' => $church->resolvedLibrarySunsetMeditationPdfUrl(),
        ]);
    }
}
