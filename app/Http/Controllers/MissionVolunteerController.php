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
use App\Http\Requests\UpdateMissionVolunteerRequest;
use App\Support\MissionPhaseBootstrap;
use App\Support\MissionPhaseLeaders;
use App\Support\MissionSla;
use App\Support\MissionTeamAccess;
use App\Support\MissionVolunteerAccountResolver;
use App\Support\MissionVolunteerFilteredRoster;
use App\Support\MissionVolunteerPayload;
use App\Support\MissionVolunteerRosterFilters;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
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
            ->registrationComplete()
            ->get();

        MissionSla::warmPhaseEntryCache($phaseVolunteers);

        $filtered = MissionVolunteerFilteredRoster::collect((int) $churchId, $request);

        $volunteers = $filtered->map(function (MissionVolunteer $v) use ($user) {
                $sla = MissionSla::metricsForVolunteer($v);
                $resolvedEmail = MissionVolunteerAccountResolver::emailForVolunteer($v);

                return [
                    'model' => $v,
                    'row' => [
                        'id' => $v->id,
                        'fullName' => $v->full_name,
                        'email' => $resolvedEmail,
                        'phone' => $v->phone,
                        'photoUrl' => $v->photo_url,
                        'phaseId' => $v->mission_phase_id,
                        'phaseName' => $v->phase?->name ?? '—',
                        'profileType' => $v->profile_type,
                        'ministryPreference' => $v->ministry_preference,
                        'engagementLevel' => $v->engagement_level,
                        'hasEmail' => $resolvedEmail !== null,
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

        $canManage = MissionTeamAccess::canManagePhases($user);

        $church = Church::query()->find($churchId);

        return Inertia::render('Mission/Index', [
            'volunteers' => $volunteersPaginated,
            'phases' => $phases,
            'filters' => MissionVolunteerRosterFilters::filterState($request),
            'overdueTotal' => $overdueTotal,
            'options' => config('mission'),
            'canManage' => $canManage,
            'operablePhaseIds' => MissionTeamAccess::operablePhaseIds($user),
            'storeStageUrl' => route('mission.phases.store'),
            'updateStageUrlPattern' => route('mission.phases.update', ['phase' => 0]),
            'destroyStageUrlPattern' => route('mission.phases.destroy', ['phase' => 0]),
            'updatePhaseUrlPattern' => route('mission.volunteers.phase', ['missionVolunteer' => 0]),
            'detailUrlPattern' => route('mission.volunteers.detail', ['missionVolunteer' => 0]),
            'broadcastStoreUrl' => route('mission.broadcast.store'),
            'filteredTotal' => $total,
            'whatsappDefaultMessage' => trim((string) ($church?->mission_whatsapp_default_message ?? '')),
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

        $church = Church::query()->find($churchId);

        return response()->json([
            'volunteer' => $volunteerPayload,
            'stages' => $stages,
            'notes' => $notes,
            'phaseHistory' => $phaseHistory,
            'canManage' => $canManage,
            'canEditPhase' => $canEditPhase,
            'canAddNote' => $canManage || $canEditPhase,
            'updatePhaseUrl' => $canEditPhase ? route('mission.volunteers.phase', $missionVolunteer) : null,
            'updateUrl' => $canEditPhase ? route('mission.volunteers.update', $missionVolunteer) : null,
            'canEditRegistration' => $canEditPhase,
            'storeNoteUrl' => route('mission.volunteers.notes.store', $missionVolunteer),
            'destroyUrl' => $canManage ? route('mission.volunteers.destroy', $missionVolunteer) : null,
            'whatsappDefaultMessage' => trim((string) ($church?->mission_whatsapp_default_message ?? '')),
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

    public function update(UpdateMissionVolunteerRequest $request, MissionVolunteer $missionVolunteer): JsonResponse
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

        $valid = $request->validated();

        $photoPath = null;
        if ($request->hasFile('photo')) {
            if ($missionVolunteer->photo_path) {
                Storage::disk('public')->delete($missionVolunteer->photo_path);
            }
            /** @var UploadedFile $photoFile */
            $photoFile = $request->file('photo');
            $photoPath = $photoFile->store('mission/volunteers', 'public');
        }

        $missionVolunteer->forceFill(
            MissionVolunteerPayload::registrationAttributes($valid, $photoPath),
        )->save();

        $missionVolunteer->load('phase');
        $volunteerPayload = MissionVolunteerPayload::serializeForFrontend($missionVolunteer);
        $volunteerPayload['sla'] = MissionSla::metricsForVolunteer($missionVolunteer);

        return response()->json([
            'volunteer' => $volunteerPayload,
            'message' => 'Cadastro atualizado.',
        ]);
    }

    public function storeNote(Request $request, MissionVolunteer $missionVolunteer): RedirectResponse
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $missionVolunteer->church_id === (int) $churchId, 404);

        $user = $request->user();
        abort_unless($user, 401);

        $canManage = MissionTeamAccess::canManagePhases($user);
        abort_unless(
            $canManage || MissionTeamAccess::canOperateVolunteer($user, $missionVolunteer->mission_phase_id),
            403,
            'Você só pode alterar cadastros na sua fase.',
        );

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

    public function usersIndex(Request $request): Response
    {
        $this->canView($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        MissionPhaseBootstrap::ensurePhasesForChurch((int) $churchId);

        $user = $request->user();
        abort_unless($user, 401);

        $phases = MissionPhase::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->get(['id', 'name'])
            ->map(fn (MissionPhase $p) => [
                'id' => $p->id,
                'name' => $p->name,
            ]);

        $users = MissionVolunteer::query()
            ->where('church_id', $churchId)
            ->orderBy('full_name')
            ->get()
            ->map(function (MissionVolunteer $volunteer) {
                $linkedUser = MissionVolunteerAccountResolver::userForVolunteer($volunteer);
                if ($linkedUser !== null) {
                    $linkedUser->loadMissing('missionPhases:id,name');
                }

                return [
                    'volunteer_id' => $volunteer->id,
                    'id' => $linkedUser?->id,
                    'name' => $volunteer->full_name,
                    'email' => MissionVolunteerAccountResolver::emailForVolunteer($volunteer, $linkedUser),
                    'photoUrl' => $volunteer->photo_url ?? $linkedUser?->photo_url,
                    'has_app_account' => $linkedUser !== null,
                    'is_phase_leader' => (bool) ($linkedUser?->is_mission_team ?? false),
                    'mission_phase_ids' => $linkedUser
                        ? $linkedUser->missionPhases->pluck('id')->map(fn ($id) => (int) $id)->values()->all()
                        : [],
                    'phase_labels' => $linkedUser
                        ? $linkedUser->missionPhases
                            ->sortBy(fn (MissionPhase $p) => $p->name)
                            ->map(fn (MissionPhase $p) => $p->name)
                            ->values()
                            ->all()
                        : [],
                ];
            });

        return Inertia::render('Mission/Users', [
            'users' => $users,
            'phases' => $phases,
            'canManage' => MissionTeamAccess::canManagePhases($user),
            'updateUrlPattern' => route('mission.users.update', ['user' => 0]),
        ]);
    }

    public function updatePhaseLeader(Request $request, User $user): RedirectResponse
    {
        $this->canManage($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId && (int) $user->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'is_phase_leader' => ['required', 'boolean'],
            'mission_phase_ids' => ['nullable', 'array'],
            'mission_phase_ids.*' => ['integer', 'exists:mission_phases,id'],
        ]);

        try {
            MissionPhaseLeaders::syncForUser(
                $user,
                (bool) $valid['is_phase_leader'],
                collect($valid['mission_phase_ids'] ?? [])->map(fn ($id) => (int) $id)->all(),
                (int) $churchId,
            );
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            if ($e->getStatusCode() === 422) {
                return back()->with('error', $e->getMessage() ?: 'Não foi possível atualizar o líder de fase.');
            }

            throw $e;
        }

        return back()->with('success', 'Liderança de fase atualizada.');
    }
}
