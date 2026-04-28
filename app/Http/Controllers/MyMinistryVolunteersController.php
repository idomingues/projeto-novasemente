<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MyMinistryVolunteersController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUse(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        if ($u->hasRole(['admin', 'super_admin'])) {
            return;
        }
        // Líder é definido por checkbox no cadastro do usuário.
        abort_unless((bool) ($u->is_ministry_leader ?? false), 403);
    }

    public function index(Request $request): Response
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];

        $invites = VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->whereIn('ministry_id', $ministryIds)
            ->with(['volunteer:id,name,email,phone', 'ministry:id,name'])
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        $invites->setCollection(
            $invites->getCollection()->map(fn (VolunteerMinistryInvitation $i) => [
                'id' => $i->id,
                'createdAt' => $i->created_at?->toIso8601String(),
                'ministryName' => $i->ministry?->name,
                'volunteer' => [
                    'id' => $i->volunteer_id,
                    'name' => $i->volunteer?->name,
                    'email' => $i->volunteer?->email,
                    'phone' => $i->volunteer?->phone,
                ],
                // status do convite (resposta do voluntário ao link público)
                'inviteStatus' => $i->status,
                // status interno do líder
                'leaderStatus' => $i->leader_status,
                'leaderNote' => $i->leader_note,
                'updateUrl' => route('ministry-lead.my-volunteers.update', $i),
            ]),
        );

        return Inertia::render('MinistryLeadVolunteers/MyVolunteers', [
            'invitations' => $invites,
        ]);
    }

    public function update(Request $request, VolunteerMinistryInvitation $invitation): RedirectResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
        abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);

        $fromStatus = $invitation->leader_status;

        $valid = $request->validate([
            'leader_status' => ['nullable', 'string', Rule::in(['denied', 'training', 'active'])],
            'leader_note' => ['nullable', 'string', 'max:5000'],
        ]);

        if (($valid['leader_status'] ?? null) === 'denied') {
            $note = trim((string) ($valid['leader_note'] ?? ''));
            abort_unless(mb_strlen($note) >= 5, 422, 'Mensagem obrigatória para recusar.');
        }

        $invitation->forceFill([
            'leader_status' => $valid['leader_status'] ?? null,
            // mensagem só faz sentido em "Recusar"; nos demais estados limpamos para não confundir
            'leader_note' => ($valid['leader_status'] ?? null) === 'denied' ? ($valid['leader_note'] ?? null) : null,
            'leader_status_set_by_user_id' => $user?->id,
            'leader_status_set_at' => now(),
        ])->save();

        // Histórico (status anterior/novo, data/hora e usuário).
        if ($fromStatus !== ($invitation->leader_status ?? null) || (($valid['leader_status'] ?? null) === 'denied')) {
            VolunteerMinistryInvitationStatusHistory::create([
                'invitation_id' => $invitation->id,
                'church_id' => $invitation->church_id,
                'ministry_id' => $invitation->ministry_id,
                'volunteer_id' => $invitation->volunteer_id,
                'changed_by_user_id' => $user?->id,
                'from_status' => $fromStatus,
                'to_status' => $invitation->leader_status,
                'note' => ($invitation->leader_status === 'denied') ? $invitation->leader_note : null,
            ]);
        }

        // Para o responsável do voluntariado “ler”: registamos também como nota interna do voluntário.
        if (($valid['leader_status'] ?? null) === 'denied') {
            $ministryName = $invitation->ministry?->name ?? 'Departamento';
            $body = "Recusado pelo líder do departamento «{$ministryName}»:\n\n".trim((string) ($valid['leader_note'] ?? ''));
            VolunteerLeaderNote::create([
                'volunteer_id' => $invitation->volunteer_id,
                'church_id' => $churchId,
                'user_id' => $user?->id,
                'body' => $body,
            ]);
        }

        // Ao marcar como “Treinamento” ou “Atuante”, garantimos vínculo do voluntário ao departamento.
        if (in_array(($valid['leader_status'] ?? null), ['training', 'active'], true) && $invitation->volunteer && $invitation->ministry) {
            $invitation->volunteer->ministries()->syncWithoutDetaching([$invitation->ministry_id]);
        }

        return back()->with('success', 'Status atualizado.');
    }

    public function history(Request $request, VolunteerMinistryInvitation $invitation): JsonResponse
    {
        $this->canUse($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $invitation->church_id === (int) $churchId, 404);

        $user = $request->user();
        if (! $user?->hasRole(['admin', 'super_admin'])) {
            $ministryIds = $user?->ministries()->where('church_id', $churchId)->pluck('ministries.id')->values()->all() ?? [];
            abort_unless(in_array((int) $invitation->ministry_id, array_map('intval', $ministryIds), true), 403);
        }

        $rows = $invitation->leaderStatusHistory()
            ->with('changedBy:id,name')
            ->limit(50)
            ->get()
            ->map(fn (VolunteerMinistryInvitationStatusHistory $h) => [
                'id' => $h->id,
                'fromStatus' => $h->from_status,
                'toStatus' => $h->to_status,
                'note' => $h->note,
                'changedAt' => $h->created_at?->toIso8601String(),
                'changedBy' => $h->changedBy?->name,
            ])
            ->values()
            ->all();

        return response()->json(['history' => $rows]);
    }
}

