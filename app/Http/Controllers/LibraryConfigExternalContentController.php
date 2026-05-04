<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Services\LibraryExternalPageExtractService;
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
}

