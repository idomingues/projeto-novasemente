<?php

namespace App\Actions\Volunteers;

use App\Models\VolunteerMinistryInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class RespondToVolunteerMinistryInvitation
{
    public function accept(Request $request, VolunteerMinistryInvitation $inv): RedirectResponse
    {
        if ($redirect = $this->guard($request, $inv)) {
            return $redirect;
        }

        DB::transaction(function () use ($inv): void {
            $inv->loadMissing(['volunteer', 'ministry']);
            $volunteer = $inv->volunteer;
            $ministryId = (int) $inv->ministry_id;

            if ($volunteer && $ministryId > 0 && Schema::hasTable('ministry_volunteer')) {
                $volunteer->ministries()->syncWithoutDetaching([$ministryId]);
            }

            $inv->forceFill([
                'status' => 'accepted',
                'accepted_at' => now(),
            ])->save();

            $user = $volunteer?->user;
            if ($user) {
                $user->forceFill(['is_volunteer' => true])->save();
                $user->ensureVolunteerProfile();
            }
        });

        return redirect()
            ->route('volunteers.ministry-invite.show', ['token' => $inv->token])
            ->with('success', 'Convite aceito! O líder do departamento entrará em contato em breve pelo aplicativo.');
    }

    public function decline(Request $request, VolunteerMinistryInvitation $inv): RedirectResponse
    {
        if ($redirect = $this->guard($request, $inv)) {
            return $redirect;
        }

        $reason = trim((string) $request->input('decline_reason', ''));

        $inv->forceFill([
            'status' => 'declined',
            'declined_at' => now(),
            'decline_reason' => $reason !== '' ? $reason : null,
        ])->save();

        return redirect()
            ->route('volunteers.ministry-invite.show', ['token' => $inv->token])
            ->with('success', 'Convite recusado.');
    }

    private function guard(Request $request, VolunteerMinistryInvitation $inv): ?RedirectResponse
    {
        $inv->loadMissing(['volunteer']);
        $token = $inv->token;
        $showRoute = fn () => redirect()->route('volunteers.ministry-invite.show', ['token' => $token]);

        if ($inv->isExpired()) {
            return $showRoute()->with('error', 'Este convite expirou.');
        }

        if (! $inv->isPending()) {
            return $showRoute()->with('info', 'Este convite já foi respondido.');
        }

        $registerUrl = BuildVolunteerMinistryInvitePlainCopy::registerUrlFor($inv);
        if ($registerUrl !== null) {
            return redirect()->to($registerUrl);
        }

        $volunteerUserId = $inv->volunteer?->user_id;
        if ($volunteerUserId !== null) {
            $auth = $request->user();
            if ($auth === null || (int) $auth->id !== (int) $volunteerUserId) {
                return redirect()
                    ->route('login', ['redirect' => route('volunteers.ministry-invite.show', ['token' => $token], false)])
                    ->with('info', 'Faça login com sua conta no app para responder ao convite.');
            }
        }

        return null;
    }
}
