<?php

namespace App\Domain\Users\Actions;

use App\Models\Church;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Após registo público: associa o utilizador à igreja em contexto (sessão) e alinha dados de perfil.
 */
class SyncUserChurchFromRegistration
{
    public function __invoke(User $user, Request $request): void
    {
        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return;
        }

        $user->loadMissing('volunteerProfile');
        $phone = $user->volunteerProfile?->phone;

        $user->forceFill([
            'church_id' => $churchId,
            'phone' => $user->phone ?? $phone,
            'status' => $user->status ?? 'active',
            'is_volunteer' => $request->boolean('already_volunteer') || (bool) ($user->is_volunteer ?? false),
        ])->save();
    }
}
