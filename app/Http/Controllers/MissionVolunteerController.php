<?php

namespace App\Http\Controllers;

use App\Actions\Mission\RecordMissionVolunteerPhaseChange;
use App\Actions\Mission\SendMissionVolunteerBroadcast;
use App\Models\Church;
use App\Models\MissionVolunteerNote;
use App\Models\MissionVolunteerPhaseHistory;
use App\Models\MissionPhase;
use App\Models\MissionVolunteer;
use App\Models\User;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionSla;
use App\Support\MissionTeamAccess;
use App\Support\MissionVolunteerFilteredRoster;
use App\Support\MissionVolunteerPayload;
use App\Support\MissionVolunteerRosterFilters;
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

        $user = $request->user();
        abort_unless($user, 401);

        $phaseVolunteers = MissionVolunteer::query()
            ->with('phase:id,name,sort_order,sla_days')
            ->where('church_id', $churchId)
            ->get();

        MissionSla::warmPhaseEntryCache($phaseVolunteers);

        $filtered = MissionVolunteerFilteredRoster::collect((int) $churchId, $request);

        $volunteers = $filtered->map(function (MissionVolunteer $v) use ($user) {
                $sla = MissionSla::metricsForVolunteer($v);

                return [
                    'model' => $v,
                    'row' => [
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
                        'daysInPhase' => $sla['daysInPhase'],
                        'slaDays' => $sla['slaDays'],
                        'isOverdue' => $sla['isOverdue'],
                        'daysOverdue' => $sla['daysOverdue'],
                        'phaseEnteredAt' => $sla['phaseEnteredAt'],
                        'phaseEnteredAtLabel' => $sla['phaseEnteredAtLabel'],
                        'canEditPhase' => MissionTeamAccess::canOperateVolunteer($user, $v->mission_phase_id),
                    ],
                ];
            });

        $page = max(1, (int) $request->query('page', 1));
        $perPage = 20;
        if ($request->filled('per_page')) {
            $perPage = min(500, max(1, (int) $request->query('per_page')));
        }
        $total = $volunteers->count();
        $paginatedRows = $volunteers
            ->slice(($page - 1) * $perPage, $perPage)
            ->map(fn (array $item) => $item['row'])
            ->values();

        $volunteersPaginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedRows,
            $total,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );
        $volunteersPaginated = $volunteersPaginated->withQueryString();

        $phases = MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->get()
            ->map(function (MissionPhase $p) use ($phaseVolunteers) {
                $inPhase = $phaseVolunteers->where('mission_phase_id', $p->id);
                $overdueCount = $inPhase->filter(function (MissionVolunteer $v) {
                    return MissionSla::metricsForVolunteer($v)['isOverdue'];
                })->count();

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sort_order' => $p->sort_order,
                    'sla_days' => $p->sla_days,
                    'volunteer_count' => $inPhase->count(),
                    'overdue_count' => $overdueCount,
                ];
            });

        $overdueTotal = $phaseVolunteers->filter(function (MissionVolunteer $v) {
            return MissionSla::metricsForVolunteer($v)['isOverdue'];
        })->count();

        $teamMembers = User::query()
            ->where('church_id', $churchId)
            ->where(function ($q) {
                $q->permission('mission.view')
                    ->orWhere('is_mission_team', true);
            })
            ->with('missionPhases:id')
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'is_mission_team' => (bool) ($u->is_mission_team ?? false),
                'mission_phase_ids' => $u->missionPhases->pluck('id')->map(fn ($id) => (int) $id)->values()->all(),
                'has_mission_view' => $u->can('mission.view'),
            ]);

        $canManage = MissionTeamAccess::canManagePhases($user);

        return Inertia::render('Mission/Index', [
            'volunteers' => $volunteersPaginated,
            'phases' => $phases,
            'filters' => MissionVolunteerRosterFilters::filterState($request),
            'overdueTotal' => $overdueTotal,
            'options' => config('mission'),
            'canManage' => $canManage,
            'operablePhaseIds' => MissionTeamAccess::operablePhaseIds($user),
            'teamMembers' => $teamMembers,
            'teamUpdateUrlPattern' => route('mission.team.update', ['user' => 0]),
            'storeStageUrl' => route('mission.phases.store'),
            'updateStageUrlPattern' => route('mission.phases.update', ['phase' => 0]),
            'destroyStageUrlPattern' => route('mission.phases.destroy', ['phase' => 0]),
            'updatePhaseUrlPattern' => route('mission.volunteers.phase', ['missionVolunteer' => 0]),
            'detailUrlPattern' => route('mission.volunteers.detail', ['missionVolunteer' => 0]),
            'broadcastStoreUrl' => route('mission.broadcast.store'),
            'filteredTotal' => $total,
        ]);
    }

    public function sendBroadcast(Request $request, SendMissionVolunteerBroadcast $sendBroadcast): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $church = Church::query()->findOrFail($churchId);

        $valid = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:5000'],
            'send_email' => ['sometimes', 'boolean'],
            'send_app' => ['sometimes', 'boolean'],
        ]);

        $sendEmail = $request->boolean('send_email', true);
        $sendApp = $request->boolean('send_app', true);

        if (! $sendEmail && ! $sendApp) {
            return back()->with('error', 'Selecione ao menos um canal: e-mail ou notificação no app.');
        }

        $volunteers = MissionVolunteerFilteredRoster::collect((int) $churchId, $request);

        if ($volunteers->isEmpty()) {
            return back()->with('error', 'Nenhum cadastro corresponde ao filtro atual.');
        }

        $stats = $sendBroadcast(
            $volunteers,
            $church,
            $valid['title'],
            $valid['body'],
            $sendEmail,
            $sendApp,
        );

        $parts = ["{$stats['total']} cadastro(s) no filtro"];
        if ($sendEmail) {
            $parts[] = "{$stats['emails']} e-mail(s)";
        }
        if ($sendApp) {
            $parts[] = "{$stats['app']} notificação(ões) no app";
        }
        if ($stats['skipped_no_channel'] > 0) {
            $parts[] = "{$stats['skipped_no_channel']} sem canal disponível";
        }

        return back()->with('success', 'Notificação enviada: '.implode(' · ', $parts).'.');
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
        $user = $request->user();
        abort_unless($user, 401);

        $canManage = MissionTeamAccess::canManagePhases($user);
        $canEditPhase = MissionTeamAccess::canOperateVolunteer($user, $missionVolunteer->mission_phase_id);
        $sla = MissionSla::metricsForVolunteer($missionVolunteer);

        $stages = MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'sort_order', 'sla_days'])
            ->values()
            ->all();

        $volunteerPayload = MissionVolunteerPayload::serializeForFrontend($missionVolunteer);
        $volunteerPayload['sla'] = $sla;

        $notes = MissionVolunteerNote::query()
            ->where('mission_volunteer_id', $missionVolunteer->id)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (MissionVolunteerNote $n) => [
                'id' => $n->id,
                'body' => $n->body,
                'authorName' => $n->user?->name ?? 'Equipe',
                'createdAt' => $n->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $phaseHistory = MissionVolunteerPhaseHistory::query()
            ->where('mission_volunteer_id', $missionVolunteer->id)
            ->with('changedBy:id,name')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (MissionVolunteerPhaseHistory $h) => [
                'id' => $h->id,
                'fromPhaseName' => $h->from_phase_name,
                'toPhaseName' => $h->to_phase_name ?? '—',
                'changedAt' => $h->created_at?->toIso8601String(),
                'changedBy' => $h->changedBy?->name,
            ])
            ->values()
            ->all();

        return response()->json([
            'volunteer' => $volunteerPayload,
            'stages' => $stages,
            'notes' => $notes,
            'phaseHistory' => $phaseHistory,
            'canManage' => $canManage,
            'canEditPhase' => $canEditPhase,
            'canAddNote' => $user->can('mission.view') || $user->can('mission.manage'),
            'updatePhaseUrl' => $canEditPhase ? route('mission.volunteers.phase', $missionVolunteer) : null,
            'storeNoteUrl' => route('mission.volunteers.notes.store', $missionVolunteer),
            'destroyUrl' => $canManage ? route('mission.volunteers.destroy', $missionVolunteer) : null,
        ]);
    }

    public function updatePhase(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        $user = $request->user();
        abort_unless($user, 401);

        abort_unless(
            MissionTeamAccess::canOperateVolunteer($user, $missionVolunteer->mission_phase_id),
            403,
            'Você só pode alterar cadastros na sua fase.',
        );

        $valid = $request->validate([
            'mission_phase_id' => ['required', 'integer', 'exists:mission_phases,id'],
        ]);

        $phase = MissionPhase::query()->findOrFail($valid['mission_phase_id']);
        abort_unless((int) $phase->church_id === (int) $churchId, 404);

        $fromPhaseId = $missionVolunteer->mission_phase_id !== null
            ? (int) $missionVolunteer->mission_phase_id
            : null;

        $updates = ['mission_phase_id' => $phase->id];
        if ($fromPhaseId !== (int) $phase->id) {
            $updates['phase_entered_at'] = now();
        }
        $missionVolunteer->forceFill($updates)->save();

        if ($fromPhaseId !== (int) $phase->id) {
            app(RecordMissionVolunteerPhaseChange::class)(
                $missionVolunteer->fresh(),
                $fromPhaseId,
                (int) $phase->id,
                $user,
            );
        }

        return back()->with('success', 'Fase atualizada.');
    }

    public function storeNote(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
        ]);

        MissionVolunteerNote::create([
            'church_id' => $churchId,
            'mission_volunteer_id' => $missionVolunteer->id,
            'user_id' => $request->user()?->id,
            'body' => $valid['body'],
        ]);

        return back()->with('success', 'Anotação registrada.');
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

    public function storeStage(Request $request): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sla_days' => ['required', 'integer', 'min:1', 'max:3650'],
        ]);
        $max = (int) MissionPhase::query()->where('church_id', $churchId)->max('sort_order');

        MissionPhase::create([
            'church_id' => $churchId,
            'name' => $valid['name'],
            'sort_order' => $max + 10,
            'sla_days' => (int) $valid['sla_days'],
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
            'sla_days' => ['required', 'integer', 'min:1', 'max:3650'],
        ]);

        $phase->forceFill([
            'name' => $valid['name'],
            'sort_order' => array_key_exists('sort_order', $valid) && $valid['sort_order'] !== null
                ? (int) $valid['sort_order']
                : $phase->sort_order,
            'sla_days' => (int) $valid['sla_days'],
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

    public function updateTeamMember(Request $request, User $user): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $user->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'is_mission_team' => ['required', 'boolean'],
            'mission_phase_ids' => ['nullable', 'array'],
            'mission_phase_ids.*' => ['integer', 'exists:mission_phases,id'],
        ]);

        $phaseIds = collect($valid['mission_phase_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($phaseIds->isNotEmpty()) {
            $validPhaseCount = MissionPhase::query()
                ->where('church_id', $churchId)
                ->whereIn('id', $phaseIds)
                ->count();
            abort_unless($validPhaseCount === $phaseIds->count(), 422, 'Fase inválida para esta igreja.');
        }

        $isMissionTeam = (bool) $valid['is_mission_team'];

        if ($isMissionTeam && ! $user->can('mission.view')) {
            return back()->with('error', 'Conceda a permissão «Ver Missão» ao usuário antes de marcá-lo como equipe.');
        }

        if ($isMissionTeam && $phaseIds->isEmpty()) {
            return back()->with('error', 'Selecione ao menos uma fase para o membro da equipe Missão.');
        }

        $user->forceFill(['is_mission_team' => $isMissionTeam])->save();
        $user->missionPhases()->sync($isMissionTeam ? $phaseIds->all() : []);

        return back()->with('success', 'Equipe Missão atualizada.');
    }
}
