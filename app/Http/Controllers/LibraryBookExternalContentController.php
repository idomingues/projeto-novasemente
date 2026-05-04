<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\LibraryBook;
use App\Services\LibraryExternalPageExtractService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LibraryBookExternalContentController extends Controller
{
    public function show(Request $request, LibraryBook $libraryBook): JsonResponse
    {
        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null || (int) $libraryBook->church_id !== (int) $churchId) {
            return response()->json(['ok' => false, 'error' => 'Não encontrado.'], 404);
        }

        if ($libraryBook->published_at !== null && $libraryBook->published_at->isFuture()) {
            return response()->json(['ok' => false, 'error' => 'Não encontrado.'], 404);
        }

        if (! LibraryBook::categoryAllowsExternalUrl($libraryBook->category)) {
            return response()->json(['ok' => false, 'error' => 'Não aplicável.'], 422);
        }

        $url = trim((string) ($libraryBook->external_url ?? ''));
        if ($url === '') {
            return response()->json(['ok' => false, 'error' => 'Sem link externo.'], 422);
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
        ]);
    }
}
