<?php

namespace App\Http\Support;

use Illuminate\Http\RedirectResponse;

/** Redirect de volta ao índice com query para manter modal de edição aberto após salvar (fetch + reload no front). */
final class ListModalRedirect
{
    public static function toIndexEdit(string $routeName, object $model, string $successMessage): RedirectResponse
    {
        return redirect()->route($routeName, [
            'modal' => 'edit',
            'id' => $model->id,
        ])->with('success', $successMessage);
    }
}
