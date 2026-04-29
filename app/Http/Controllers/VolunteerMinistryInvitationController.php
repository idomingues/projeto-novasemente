<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\CreateAndNotifyVolunteerMinistryInvitation;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\Volunteer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VolunteerMinistryInvitationController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canMutate(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('volunteers.ministry_operate') || $u->can('volunteers.manage'), 403);
    }

    public function store(Request $request, Volunteer $volunteer): RedirectResponse|JsonResponse
    {
        $this->canMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'ministry_id' => ['required', 'integer', Rule::exists('ministries', 'id')->where('church_id', $churchId)],
            'channels' => ['array'],
            'channels.*' => ['string', Rule::in(['email', 'inbox'])],
            'slots' => ['array'],
            'slots.*.day_of_week' => ['required_with:slots', 'integer', 'min:0', 'max:6'],
            'slots.*.start_time' => ['nullable', 'date_format:H:i'],
            'slots.*.end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $ministry = Ministry::query()->where('church_id', $churchId)->findOrFail((int) $valid['ministry_id']);

        $slots = is_array($valid['slots'] ?? null) ? $valid['slots'] : [];
        $channels = array_values(array_unique(array_filter($valid['channels'] ?? [], fn ($c) => is_string($c) && $c !== '')));

        app(CreateAndNotifyVolunteerMinistryInvitation::class)(
            (int) $churchId,
            $volunteer,
            $ministry,
            $request->user(),
            $channels,
            $slots,
        );

        return back()->with('success', 'Convite criado.');
    }
}
