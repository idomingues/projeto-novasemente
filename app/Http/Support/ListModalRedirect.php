<?php

namespace App\Http\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

/** Redirect de volta ao índice com query para manter modal de edição aberto após salvar (fetch + reload no front). */
final class ListModalRedirect
{
    public static function toIndexEdit(string $routeName, object $model, string $successMessage): RedirectResponse|JsonResponse
    {
        $params = [
            'modal' => 'edit',
            'id' => $model->id,
        ];

        if (request()->expectsJson()) {
            return response()->json([
                'redirect' => route($routeName, $params),
                'message' => $successMessage,
            ], 201);
        }

        return redirect()->route($routeName, $params)->with('success', $successMessage);
    }
}
