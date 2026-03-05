<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvitationController extends Controller
{
    public function store(Request $request)
    {
        $valid = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['nullable', 'string', 'exists:roles,name'],
        ]);

        $token = Invitation::createToken();
        $expiresAt = now()->addDays(7);

        $invitation = Invitation::create([
            'email' => $valid['email'],
            'token' => $token,
            'role' => $valid['role'] ?? null,
            'expires_at' => $expiresAt,
        ]);

        $link = route('register', ['invitation' => $token], true);

        return redirect()->route('users.index')->with('success', 'Convite criado. Link: ' . $link)->with('invitation_link', $link);
    }

    public function destroy(Invitation $invitation)
    {
        $invitation->delete();
        return redirect()->route('users.index')->with('success', 'Convite removido.');
    }
}
