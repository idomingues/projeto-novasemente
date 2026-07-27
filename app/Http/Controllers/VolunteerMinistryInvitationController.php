<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\CreateAndNotifyVolunteerMinistryInvitation;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\Volunteer;
use App\Support\VolunteerPipelineBootstrap;
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
            'ministry_id' => ['nullable', 'integer', Rule::exists('ministries', 'id')->where('church_id', $churchId)],
            'ministry_ids' => ['nullable', 'array', 'min:1'],
            'ministry_ids.*' => ['integer', Rule::exists('ministries', 'id')->where('church_id', $churchId)],
            'channels' => ['array'],
            'channels.*' => ['string', Rule::in(['email', 'inbox'])],
            'slots' => ['array'],
            'slots.*.day_of_week' => ['required_with:slots', 'integer', 'min:0', 'max:6'],
            'slots.*.start_time' => ['nullable', 'date_format:H:i'],
            'slots.*.end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $rawIds = is_array($valid['ministry_ids'] ?? null) ? $valid['ministry_ids'] : [];
        if ($rawIds === [] && isset($valid['ministry_id'])) {
            $rawIds = [(int) $valid['ministry_id']];
        }
        $ministryIds = collect($rawIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if ($ministryIds === []) {
            return back()->withErrors(['ministry_ids' => 'Selecione pelo menos um departamento.']);
        }

        $u = $request->user();
        if (! $u?->can('volunteers.manage')) {
            $leaderIds = $u?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->values()->all() ?? [];
            $ministryIds = array_values(array_intersect($ministryIds, $leaderIds));
            if ($ministryIds === []) {
                return back()->with('error', 'Sem permissão para encaminhar para os departamentos selecionados.');
            }
        }

        $slots = is_array($valid['slots'] ?? null) ? $valid['slots'] : [];
        $channels = array_values(array_unique(array_filter($valid['channels'] ?? [], fn ($c) => is_string($c) && $c !== '')));

        $created = 0;
        $skipped = 0;
        foreach ($ministryIds as $ministryId) {
            $ministry = Ministry::query()->where('church_id', $churchId)->findOrFail($ministryId);
            $invitation = app(CreateAndNotifyVolunteerMinistryInvitation::class)(
                (int) $churchId,
                $volunteer,
                $ministry,
                $request->user(),
                $channels,
                $slots,
            );
            if ($invitation->wasRecentlyCreated) {
                $created++;
            } else {
                $skipped++;
            }
        }

        if ($created === 0 && $skipped > 0) {
            return back()->with('error', 'Este voluntário já foi encaminhado para o(s) departamento(s) selecionado(s).');
        }

        VolunteerPipelineBootstrap::moveVolunteerToStageByNormalizedName($volunteer, (int) $churchId, 'encaminhado');

        $notified = $channels !== [];
        if ($notified) {
            $msg = $created === 1
                ? 'Convite enviado ao voluntário.'
                : "{$created} convites enviados ao voluntário.";
        } else {
            $msg = $created === 1
                ? 'Voluntário encaminhado ao departamento. Use «Enviar convite» na ficha para e-mail ou WhatsApp.'
                : "Voluntário encaminhado a {$created} departamentos. Use «Enviar convite» na ficha para e-mail ou WhatsApp.";
        }

        return back()->with('success', $msg);
    }
}
