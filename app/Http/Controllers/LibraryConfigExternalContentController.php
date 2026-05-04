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
            'meditation' => (string) ($church->library_meditation_url ?? ''),
            'lesson' => (string) ($church->library_lesson_url ?? ''),
            default => '',
        };

        $url = trim($url);
        if ($url === '') {
            return response()->json(['ok' => false, 'error' => 'Link não configurado.'], 422);
        }

        /** @var LibraryExternalPageExtractService $svc */
        $svc = app(LibraryExternalPageExtractService::class);
        $result = $svc->fetchAndExtract($url);

        if (empty($result['ok'])) {
            return response()->json([
                'ok' => false,
                'error' => $result['error'] ?? 'Não foi possível obter o conteúdo.',
            ]);
        }

        return response()->json([
            'ok' => true,
            'html' => (string) ($result['html'] ?? ''),
            'source_url' => $url,
        ]);
    }
}

