<?php

namespace App\Http\Controllers;

use App\Models\Church;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SetWorkingChurchController extends Controller
{
    public function __invoke(Request $request): RedirectResponse
    {
        if (!$request->user()?->hasRole('super_admin')) {
            abort(403);
        }

        $request->validate(['church_id' => ['required', 'integer', 'exists:churches,id']]);
        $churchId = (int) $request->input('church_id');

        if (!Church::where('id', $churchId)->where('active', true)->exists()) {
            return redirect()->back()->with('error', 'Igreja não encontrada ou inativa.');
        }

        $request->session()->put('working_church_id', $churchId);

        return redirect()->back()->with('success', 'Igreja de trabalho alterada.');
    }
}
