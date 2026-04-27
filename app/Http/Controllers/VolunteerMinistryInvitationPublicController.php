<?php

namespace App\Http\Controllers;

use App\Models\VolunteerMinistryInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerMinistryInvitationPublicController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['ministry:id,name', 'volunteer:id,name,email', 'slots'])
            ->firstOrFail();

        $expired = $inv->isExpired();
        $final = in_array($inv->status, ['accepted', 'declined'], true);

        return Inertia::render('Volunteers/MinistryInvite', [
            'invitation' => [
                'token' => $inv->token,
                'status' => $inv->status,
                'expired' => $expired,
                'volunteerName' => $inv->volunteer?->name,
                'ministryName' => $inv->ministry?->name,
                'slots' => $inv->slots->map(fn ($s) => [
                    'day_of_week' => (int) $s->day_of_week,
                    'start_time' => $s->start_time ? substr((string) $s->start_time, 0, 5) : null,
                    'end_time' => $s->end_time ? substr((string) $s->end_time, 0, 5) : null,
                ])->values()->all(),
                'isFinal' => $final,
            ],
        ]);
    }

    public function accept(Request $request, string $token): RedirectResponse
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['volunteer', 'ministry'])
            ->firstOrFail();

        abort_if($inv->isExpired(), 410, 'Convite expirado.');
        abort_if($inv->status !== 'pending', 409, 'Convite já respondido.');

        $volunteer = $inv->volunteer;
        $ministry = $inv->ministry;
        abort_unless($volunteer && $ministry, 404);

        if (Schema::hasTable('ministry_volunteer')) {
            $volunteer->ministries()->syncWithoutDetaching([$ministry->id]);
        }

        $inv->forceFill([
            'status' => 'accepted',
            'accepted_at' => now(),
        ])->save();

        return redirect()->route('volunteers.ministry-invite.show', ['token' => $token])->with('success', 'Aceite registado. Obrigado!');
    }

    public function decline(Request $request, string $token): RedirectResponse
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['volunteer', 'ministry'])
            ->firstOrFail();

        abort_if($inv->isExpired(), 410, 'Convite expirado.');
        abort_if($inv->status !== 'pending', 409, 'Convite já respondido.');

        $valid = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ]);

        $inv->forceFill([
            'status' => 'declined',
            'declined_at' => now(),
            'decline_reason' => $valid['reason'],
        ])->save();

        return redirect()->route('volunteers.ministry-invite.show', ['token' => $token])->with('success', 'Recusa registada. Obrigado por avisar.');
    }
}

