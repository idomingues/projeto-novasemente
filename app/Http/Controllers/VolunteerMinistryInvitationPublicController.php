<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\BuildVolunteerMinistryInvitePlainCopy;
use App\Actions\Volunteers\RespondToVolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerMinistryInvitationPublicController extends Controller
{
    public function show(Request $request, string $token): RedirectResponse|Response
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['ministry:id,name', 'volunteer:id,name,email,user_id', 'slots', 'church:id,ministry_invitation_intro'])
            ->firstOrFail();

        $registerUrl = BuildVolunteerMinistryInvitePlainCopy::registerUrlFor($inv);
        if ($registerUrl !== null) {
            return redirect()->to($registerUrl);
        }

        $volunteer = $inv->volunteer;
        $volunteerHasUser = (bool) ($volunteer?->user_id);
        $authUser = $request->user();
        $loggedInAsInvitee = $authUser !== null
            && $volunteerHasUser
            && (int) $authUser->id === (int) $volunteer->user_id;

        if ($inv->isPending() && ! $inv->isExpired() && $volunteerHasUser && ! $loggedInAsInvitee) {
            return redirect()
                ->route('login', ['redirect' => route('volunteers.ministry-invite.show', ['token' => $inv->token], false)])
                ->with('info', 'Faça login no aplicativo para ver o convite.');
        }

        $expired = $inv->isExpired();
        $final = in_array($inv->status, ['accepted', 'declined'], true);
        $volunteerEmail = trim((string) ($volunteer?->email ?? ''));

        return Inertia::render('Volunteers/MinistryInvite', [
            'invitation' => [
                'token' => $inv->token,
                'status' => $inv->status,
                'expired' => $expired,
                'volunteerName' => $inv->volunteer?->name,
                'ministryName' => $inv->ministry?->name,
                'volunteerHasUser' => $volunteerHasUser,
                'loggedInAsInvitee' => $loggedInAsInvitee,
                'registerUrl' => null,
                'slots' => $inv->slots->map(fn ($s) => [
                    'day_of_week' => (int) $s->day_of_week,
                    'start_time' => $s->start_time ? substr((string) $s->start_time, 0, 5) : null,
                    'end_time' => $s->end_time ? substr((string) $s->end_time, 0, 5) : null,
                ])->values()->all(),
                'isFinal' => $final,
                'introParagraph' => $inv->resolvedIntroParagraph(),
                'volunteerEmail' => $volunteerEmail !== '' ? $volunteerEmail : null,
                'pendingWithoutEmail' => $inv->isPending() && ! $expired && $volunteerEmail === '',
                'canRespond' => $inv->isPending() && ! $expired && $loggedInAsInvitee && $volunteerHasUser,
            ],
        ]);
    }

    public function accept(Request $request, string $token, RespondToVolunteerMinistryInvitation $respond): RedirectResponse
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['volunteer'])
            ->firstOrFail();

        return $respond->accept($request, $inv);
    }

    public function decline(Request $request, string $token, RespondToVolunteerMinistryInvitation $respond): RedirectResponse
    {
        $inv = VolunteerMinistryInvitation::query()
            ->where('token', $token)
            ->with(['volunteer'])
            ->firstOrFail();

        return $respond->decline($request, $inv);
    }
}
