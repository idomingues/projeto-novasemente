<?php

namespace App\Http\Controllers;

use App\Actions\Mission\SendMissionVolunteerInvite;
use App\Models\Church;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionVolunteerPayload;
use App\Support\SearchTerm;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class MissionVolunteerController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canView(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('mission.view') || $u->can('mission.manage'), 403);
    }

    private function canManage(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('mission.manage'), 403);
    }

    public function index(Request $request): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        MissionPhaseBootstrap::ensurePhasesForChurch((int) $churchId);

        $search = trim((string) $request->query('search', ''));
        $phaseFilter = $request->query('mission_phase_id');

        $query = MissionVolunteer::query()
            ->with('phase:id,name,sort_order')
            ->where('church_id', $churchId);

        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($query, ['full_name', 'email', 'phone'], $search);
        }

        if ($phaseFilter !== null && $phaseFilter !== '') {
            $query->where('mission_phase_id', (int) $phaseFilter);
        }

        $volunteers = $query
            ->orderBy('full_name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (MissionVolunteer $v) => [
                'id' => $v->id,
                'fullName' => $v->full_name,
                'email' => $v->email,
                'phone' => $v->phone,
                'photoUrl' => $v->photo_url,
                'phaseId' => $v->mission_phase_id,
                'phaseName' => $v->phase?->name ?? '—',
                'profileType' => $v->profile_type,
                'ministryPreference' => $v->ministry_preference,
                'engagementLevel' => $v->engagement_level,
                'hasEmail' => $v->display_email !== null,
                'lastInviteSentAt' => $v->last_invite_sent_at?->format('d/m/Y H:i'),
                'createdAt' => $v->created_at?->format('d/m/Y'),
            ]);

        $phases = MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (MissionPhase $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sort_order' => $p->sort_order,
                'volunteer_count' => MissionVolunteer::query()
                    ->where('church_id', $churchId)
                    ->where('mission_phase_id', $p->id)
                    ->count(),
            ]);

        return Inertia::render('Mission/Index', [
            'volunteers' => $volunteers,
            'phases' => $phases,
            'filters' => [
                'search' => $search,
                'mission_phase_id' => (string) ($phaseFilter ?? ''),
            ],
            'options' => config('mission'),
            'canManage' => $request->user()?->can('mission.manage') ?? false,
            'storeStageUrl' => route('mission.phases.store'),
            'updateStageUrlPattern' => route('mission.phases.update', ['phase' => 0]),
            'destroyStageUrlPattern' => route('mission.phases.destroy', ['phase' => 0]),
            'inviteUrl' => route('mission.volunteers.invite'),
            'bulkInviteUrl' => route('mission.volunteers.invite-bulk'),
            'updatePhaseUrlPattern' => route('mission.volunteers.phase', ['missionVolunteer' => 0]),
            'detailUrlPattern' => route('mission.volunteers.detail', ['missionVolunteer' => 0]),
        ]);
    }

    public function show(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        return redirect()->route('mission.index', ['cadastro' => $missionVolunteer->id]);
    }

    public function detail(Request $request, MissionVolunteer $missionVolunteer): \Illuminate\Http\JsonResponse
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        $missionVolunteer->load('phase');
        $canManage = $request->user()?->can('mission.manage') ?? false;

        $stages = MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'sort_order'])
            ->values()
            ->all();

        return response()->json([
            'volunteer' => MissionVolunteerPayload::serializeForFrontend($missionVolunteer),
            'stages' => $stages,
            'canManage' => $canManage,
            'updatePhaseUrl' => route('mission.volunteers.phase', $missionVolunteer),
            'inviteUrl' => route('mission.volunteers.invite'),
            'destroyUrl' => $canManage ? route('mission.volunteers.destroy', $missionVolunteer) : null,
        ]);
    }

    public function updatePhase(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'mission_phase_id' => ['required', 'integer', 'exists:mission_phases,id'],
        ]);

        $phase = MissionPhase::query()->findOrFail($valid['mission_phase_id']);
        abort_unless((int) $phase->church_id === (int) $churchId, 404);

        $missionVolunteer->forceFill(['mission_phase_id' => $phase->id])->save();

        return back()->with('success', 'Fase atualizada.');
    }

    public function destroy(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        if ($missionVolunteer->photo_path) {
            Storage::disk('public')->delete($missionVolunteer->photo_path);
        }

        $missionVolunteer->delete();

        return redirect()->route('mission.index')->with('success', 'Cadastro excluído.');
    }

    public function invite(Request $request, SendMissionVolunteerInvite $sendInvite): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'mission_volunteer_id' => ['required', 'integer', 'exists:mission_volunteers,id'],
        ]);

        $volunteer = MissionVolunteer::query()->findOrFail($valid['mission_volunteer_id']);
        abort_unless((int) $volunteer->church_id === (int) $churchId, 404);

        $result = $sendInvite($volunteer, $request->user());

        return back()->with([
            'success' => $result['email_sent']
                ? 'Convite enviado por e-mail. Você também pode compartilhar o link pelo WhatsApp.'
                : 'Convite gerado. Compartilhe o link pelo WhatsApp ou copie para enviar.',
            'invitation_link' => $result['link'],
            'invitation_for_name' => $volunteer->full_name,
            'mission_invite_phone' => $volunteer->phone,
        ]);
    }

    public function inviteBulk(Request $request, SendMissionVolunteerInvite $sendInvite): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'mission_volunteer_ids' => ['required', 'array', 'min:1'],
            'mission_volunteer_ids.*' => ['integer', 'exists:mission_volunteers,id'],
        ]);

        $emailed = 0;
        $linkOnly = 0;
        $skipped = 0;

        foreach ($valid['mission_volunteer_ids'] as $id) {
            $volunteer = MissionVolunteer::query()->find($id);
            if (! $volunteer || (int) $volunteer->church_id !== (int) $churchId) {
                $skipped++;

                continue;
            }
            $result = $sendInvite($volunteer, $request->user());
            if ($result['email_sent']) {
                $emailed++;
            } else {
                $linkOnly++;
            }
        }

        $parts = [];
        if ($emailed > 0) {
            $parts[] = "{$emailed} por e-mail";
        }
        if ($linkOnly > 0) {
            $parts[] = "{$linkOnly} sem e-mail (abra a ficha e use Enviar convite para WhatsApp)";
        }
        if ($skipped > 0) {
            $parts[] = "{$skipped} ignorado(s)";
        }

        $msg = $parts !== [] ? 'Convites: '.implode('; ', $parts).'.' : 'Nenhum convite processado.';

        return back()->with('success', $msg);
    }

    public function storeStage(Request $request): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $max = (int) MissionPhase::query()->where('church_id', $churchId)->max('sort_order');

        MissionPhase::create([
            'church_id' => $churchId,
            'name' => $valid['name'],
            'sort_order' => $max + 10,
        ]);

        return redirect()->route('mission.index')->with('success', 'Fase criada.');
    }

    public function updateStageMeta(Request $request, MissionPhase $phase): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $phase->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65000'],
        ]);

        $phase->forceFill([
            'name' => $valid['name'],
            'sort_order' => array_key_exists('sort_order', $valid) && $valid['sort_order'] !== null
                ? (int) $valid['sort_order']
                : $phase->sort_order,
        ])->save();

        return back()->with('success', 'Fase atualizada.');
    }

    public function destroyStage(Request $request, MissionPhase $phase): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $phase->church_id === (int) $churchId, 404);

        $fallbackId = MissionPhaseBootstrap::fallbackPhaseIdOnDelete((int) $churchId, (int) $phase->id);
        if ($fallbackId) {
            MissionPhaseBootstrap::reassignVolunteersFromPhase((int) $churchId, (int) $phase->id, (int) $fallbackId);
        }

        $phase->delete();

        return back()->with('success', 'Fase excluída.');
    }
}
