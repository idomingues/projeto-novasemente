<?php

namespace App\Http\Controllers;

use App\Actions\Volunteers\ApplyVolunteerMinistryLeaderStatusUpdate;
use App\Domain\Volunteers\Actions\DeleteVolunteer;
use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerClearanceCheck;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerMinistryInvitationStatusHistory;
use App\Models\VolunteerPipelineStage;
use App\Models\VolunteerSelfSignupToken;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerLeadRosterFilters;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerSignupDetailPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class VolunteerPipelineLeadController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUseRead(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless(
            $u->can('volunteers.view') || $u->can('volunteers.manage') || $u->can('volunteers.ministry_operate'),
            403
        );
    }

    private function canUseMutate(Request $request): void
    {
        $u = $request->user();
        abort_unless($u, 401);
        abort_unless($u->can('volunteers.ministry_operate') || $u->can('volunteers.manage'), 403);
    }

    private function volunteerVisibleInChurch(Volunteer $volunteer, int $churchId): bool
    {
        return VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->whereKey($volunteer->getKey())
            ->exists();
    }

    /** @return list<int> */
    private function leaderMinistryIdsForChurch(Request $request, int $churchId): array
    {
        $u = $request->user();
        if ($u?->can('volunteers.manage')) {
            return Ministry::query()
                ->where('church_id', $churchId)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return $u?->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all() ?? [];
    }

    private function userCanManageVolunteerRequests(?User $user): bool
    {
        if ($user === null) {
            return false;
        }
        if ($user->hasAnyRole(['super_admin', 'admin'])) {
            return true;
        }

        return $user->can('solicitations.manage');
    }

    public function index(Request $request, VolunteerRequestSolicitationController $volunteerRequests): Response|RedirectResponse
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $canManageVolunteerRequests = $this->userCanManageVolunteerRequests($user);

        $secao = (string) $request->query('secao', 'quadro');
        if (! in_array($secao, ['quadro', 'pedidos'], true)) {
            $secao = 'quadro';
        }
        if ($secao === 'pedidos' && ! $canManageVolunteerRequests) {
            return redirect()->route('ministry-lead.volunteers.index', ['secao' => 'quadro']);
        }
        $roster = VolunteerChurchRosterBuilder::paginated($request, (int) $churchId, $user, 25, false);
        $stages = $roster['stages'];
        $archivedVolunteerCount = $roster['archivedVolunteerCount'];
        $volunteers = $roster['volunteers'];
        $ministries = $roster['ministries'];
        $filters = $roster['filters'];

        $publicVolunteerSignupUrl = null;
        if ($churchId !== null && Schema::hasTable('volunteer_self_signup_tokens')) {
            try {
                $publicVolunteerSignupUrl = VolunteerSelfSignupToken::ensurePublicSignupUrl($churchId);
            } catch (\Throwable) {
                $publicVolunteerSignupUrl = null;
            }
        }

        $encaminharMinistryIds = null;
        if ($user && ! $user->can('volunteers.manage')) {
            $encaminharMinistryIds = $user->ministries()
                ->where('church_id', $churchId)
                ->pluck('ministries.id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        $payload = [
            'secao' => $secao,
            'canManageVolunteerRequests' => $canManageVolunteerRequests,
            'stages' => $stages,
            'archivedVolunteerCount' => $archivedVolunteerCount,
            'volunteers' => $volunteers,
            'filters' => $filters,
            'ministries' => $ministries,
            'encaminharMinistryIds' => $encaminharMinistryIds,
            'storeStageUrl' => route('ministry-lead.volunteers.pipeline.stages.store'),
            'canVolunteerManage' => $user && $user->can('volunteers.manage'),
            'canPipelineMutate' => $user && ($user->can('volunteers.manage') || $user->can('volunteers.ministry_operate')),
            'volunteersAdminUrl' => route('volunteers.index'),
            'publicVolunteerSignupUrl' => $publicVolunteerSignupUrl,
        ];

        if ($canManageVolunteerRequests) {
            $payload = array_merge($payload, $volunteerRequests->staffIndexPayload($request, (int) $churchId));
        }

        return Inertia::render('MinistryLeadVolunteers/Pipeline', $payload);
    }

    public function detail(Request $request, Volunteer $volunteer): JsonResponse
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

        $volunteer->refresh()->load([
            'ministries:id,name,church_id',
            'user:id,email,name,photo_url',
            'user.roles:id,name',
            'user.ministries:id,name',
            'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with(['stage', 'adminWorkflowStage']),
        ]);

        $pipe = $volunteer->churchPipelines->firstWhere('church_id', $churchId);

        VolunteerPipelineBootstrap::ensureFinalizadoStageForChurch($churchId);
        VolunteerPipelineBootstrap::ensureRecusaStagesForChurch($churchId);

        $isAdminWorkflow = $request->user()?->can('volunteers.manage') === true;
        $adminWorkflowStageId = $isAdminWorkflow
            ? VolunteerPipelineBootstrap::resolveAdminWorkflowStageId($churchId, $pipe?->admin_workflow_stage_id)
            : null;
        $stages = $isAdminWorkflow
            ? VolunteerPipelineBootstrap::adminWorkflowStagesForChurch($churchId)
            : VolunteerPipelineStage::query()
                ->where('church_id', $churchId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'name', 'sort_order'])
                ->map(fn (VolunteerPipelineStage $s) => [
                    'id' => (int) $s->id,
                    'name' => $s->name,
                    'sort_order' => (int) $s->sort_order,
                ])
                ->values()
                ->all();

        $notes = VolunteerLeaderNote::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(80)
            ->get()
            ->map(fn (VolunteerLeaderNote $n) => [
                'id' => $n->id,
                'body' => $n->body,
                'authorName' => $n->user?->name ?? 'Equipe',
                'createdAt' => $n->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $attachedIds = $volunteer->ministries
            ->filter(fn (Ministry $m) => (int) $m->church_id === (int) $churchId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
        $attachedSet = array_flip($attachedIds);
        $leaderIds = $this->leaderMinistryIdsForChurch($request, $churchId);
        $leaderSet = array_flip($leaderIds);
        $canMutate = $request->user()?->can('volunteers.ministry_operate') || $request->user()?->can('volunteers.manage');

        $churchMinistries = Ministry::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $ministryOptions = $churchMinistries->map(fn (Ministry $m) => [
            'id' => $m->id,
            'name' => $m->name,
            'attached' => isset($attachedSet[(int) $m->id]),
            'canEdit' => isset($leaderSet[(int) $m->id]),
        ])->values()->all();

        $canManageLeaderStatus = $request->user()?->can('volunteers.manage') === true;
        $statusHistoryByMinistry = $this->statusHistoryByMinistryForVolunteer(
            $volunteer,
            $churchId,
            $attachedSet,
            $leaderSet,
            $canManageLeaderStatus,
        );

        return response()->json([
            'volunteer' => VolunteerSignupDetailPresenter::forVolunteer($volunteer),
            'pipeline' => [
                'stageId' => $pipe?->stage_id,
                'stageName' => $pipe?->stage?->name,
                'adminWorkflowStageId' => $adminWorkflowStageId,
            ],
            'stages' => $stages,
            'statusHistoryByMinistry' => $statusHistoryByMinistry,
            'notes' => $notes,
            'ministryOptions' => $ministryOptions,
            'updateStageUrl' => route('ministry-lead.volunteers.pipeline.stage', $volunteer),
            'storeNoteUrl' => route('ministry-lead.volunteers.pipeline.notes.store', $volunteer),
            'syncMinistriesUrl' => $canMutate
                ? route('ministry-lead.volunteers.pipeline.ministries.sync', $volunteer)
                : null,
            'destroyVolunteerUrl' => $request->user()?->can('volunteers.manage')
                ? route('ministry-lead.volunteers.pipeline.destroy', $volunteer)
                : null,
            'archiveVolunteerUrl' => $request->user()?->can('volunteers.manage') && ! ($pipe?->staff_archived_at)
                ? route('ministry-lead.volunteers.pipeline.archive', $volunteer)
                : null,
            'unarchiveVolunteerUrl' => $request->user()?->can('volunteers.manage') && $pipe?->staff_archived_at
                ? route('ministry-lead.volunteers.pipeline.unarchive', $volunteer)
                : null,
            'updatePasswordUrl' => $this->pipelinePasswordUpdateUrl($request, $volunteer),
        ]);
    }

    public function updatePassword(Request $request, Volunteer $volunteer): RedirectResponse
    {
        abort_unless($request->user()?->can('volunteers.manage'), 403);

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        if (! $request->filled('app_password')) {
            return back();
        }

        $validated = $request->validate([
            'app_password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $volunteer->loadMissing('user');
        $user = $volunteer->user;
        if ($user === null) {
            return back()->withErrors([
                'app_password' => 'Este voluntário ainda não tem conta no app. Crie o acesso em Voluntários ou envie um convite.',
            ]);
        }

        if ($user->canAccessAdminMenu()) {
            return back()->withErrors([
                'app_password' => 'Conta da equipe do painel — altere a senha em Usuários.',
            ]);
        }

        $user->forceFill(['password' => $validated['app_password']])->save();

        return back()->with('success', 'Senha de acesso atualizada.');
    }

    private function pipelinePasswordUpdateUrl(Request $request, Volunteer $volunteer): ?string
    {
        if ($request->user()?->can('volunteers.manage') !== true) {
            return null;
        }

        $volunteer->loadMissing('user');
        $user = $volunteer->user;
        if ($user === null || $user->canAccessAdminMenu()) {
            return null;
        }

        return route('ministry-lead.volunteers.pipeline.password', $volunteer);
    }

    public function archiveVolunteer(Request $request, Volunteer $volunteer): RedirectResponse
    {
        abort_unless($request->user()?->can('volunteers.manage'), 403);

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

        VolunteerChurchPipeline::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteer->id)
            ->update(['staff_archived_at' => now()]);

        return redirect()
            ->route('ministry-lead.volunteers.index', $this->volunteerIndexQueryFromRequest($request, [
                'secao' => 'quadro',
                'pipeline_stage_id' => '',
            ]))
            ->with('success', 'Voluntário arquivado nesta igreja.');
    }

    public function unarchiveVolunteer(Request $request, Volunteer $volunteer): RedirectResponse
    {
        abort_unless($request->user()?->can('volunteers.manage'), 403);

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

        VolunteerChurchPipeline::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteer->id)
            ->update(['staff_archived_at' => null]);

        return redirect()
            ->route('ministry-lead.volunteers.index', $this->volunteerIndexQueryFromRequest($request, [
                'secao' => 'quadro',
                'pipeline_stage_id' => VolunteerLeadRosterFilters::PIPELINE_STAGE_ARCHIVED,
            ]))
            ->with('success', 'Voluntário restaurado na lista ativa.');
    }

    /**
     * @param  array<string, string|null>  $overrides
     * @return array<string, string>
     */
    private function volunteerIndexQueryFromRequest(Request $request, array $overrides = []): array
    {
        $params = ['secao' => 'quadro'];
        foreach (VolunteerLeadRosterFilters::filterState($request) as $key => $value) {
            if ($key === 'arquivados') {
                continue;
            }
            if (is_string($value) && $value !== '') {
                $params[$key] = $value;
            }
        }
        foreach (['secao', 'pipeline_stage_id', 'modal_kind', 'modal_id'] as $key) {
            if (! array_key_exists($key, $overrides)) {
                continue;
            }
            $val = $overrides[$key];
            if (is_string($val) && $val !== '') {
                $params[$key] = $val;
            } else {
                unset($params[$key]);
            }
        }

        return $params;
    }

    public function storeStage(Request $request): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $max = (int) VolunteerPipelineStage::query()->where('church_id', $churchId)->max('sort_order');

        VolunteerPipelineStage::create([
            'church_id' => $churchId,
            'name' => $valid['name'],
            'sort_order' => $max + 10,
        ]);

        return redirect()->route('ministry-lead.volunteers.index')->with('success', 'Fase criada.');
    }

    public function updateStageMeta(Request $request, VolunteerPipelineStage $stage): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $stage->church_id === (int) $churchId, 404);

        $valid = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65000'],
        ]);

        $stage->forceFill([
            'name' => $valid['name'],
            'sort_order' => array_key_exists('sort_order', $valid) && $valid['sort_order'] !== null ? (int) $valid['sort_order'] : $stage->sort_order,
        ])->save();

        return back()->with('success', 'Fase atualizada.');
    }

    public function destroyStage(Request $request, VolunteerPipelineStage $stage): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless((int) $stage->church_id === (int) $churchId, 404);

        $fallbackStageId = VolunteerPipelineBootstrap::defaultStageIdForNewVolunteer($churchId);
        if ($fallbackStageId && Schema::hasTable('volunteer_church_pipelines')) {
            VolunteerChurchPipeline::query()
                ->where('church_id', $churchId)
                ->where('stage_id', $stage->id)
                ->update(['stage_id' => (int) $fallbackStageId]);
        }

        $stage->delete();

        return back()->with('success', 'Fase excluída.');
    }

    public function storeNote(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        $valid = $request->validate([
            'body' => ['required', 'string', 'max:10000'],
        ]);

        VolunteerLeaderNote::create([
            'volunteer_id' => $volunteer->id,
            'church_id' => $churchId,
            'user_id' => $request->user()?->id,
            'body' => $valid['body'],
        ]);

        return back()->with('success', 'Anotação registada.');
    }

    public function syncMinistries(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        $valid = $request->validate([
            'ministry_ids' => ['present', 'array'],
            'ministry_ids.*' => ['integer', Rule::exists('ministries', 'id')->where('church_id', $churchId)],
        ]);

        $requestedIds = collect($valid['ministry_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        $leaderIds = $this->leaderMinistryIdsForChurch($request, $churchId);
        $currentIds = $volunteer->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $untouchable = array_values(array_diff($currentIds, $leaderIds));
        $leaderChoice = array_values(array_intersect($requestedIds, $leaderIds));
        $finalIds = array_values(array_unique(array_merge($untouchable, $leaderChoice)));
        $removed = array_values(array_diff($currentIds, $finalIds));

        DB::transaction(function () use ($volunteer, $churchId, $finalIds, $removed) {
            app(SyncVolunteerMinistryAttachments::class)($volunteer, $finalIds);

            foreach ($removed as $ministryId) {
                VolunteerMinistryInvitation::query()
                    ->where('volunteer_id', $volunteer->id)
                    ->where('church_id', $churchId)
                    ->where('ministry_id', $ministryId)
                    ->delete();

                if (Schema::hasTable('volunteer_clearance_checks')) {
                    VolunteerClearanceCheck::query()
                        ->where('volunteer_id', $volunteer->id)
                        ->where('ministry_id', $ministryId)
                        ->delete();
                }
            }
        });

        return back()->with('success', 'Departamentos atualizados.');
    }

    public function updateStage(Request $request, Volunteer $volunteer): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        $request->merge([
            'stage_id' => $request->input('stage_id') === '' || $request->input('stage_id') === null
                ? null
                : $request->input('stage_id'),
        ]);

        $isAdminManage = $request->user()?->can('volunteers.manage') === true;

        $valid = $request->validate([
            'stage_id' => [
                $isAdminManage ? 'nullable' : 'required',
                'integer',
                Rule::exists('volunteer_pipeline_stages', 'id')->where('church_id', $churchId),
            ],
        ]);

        if ($isAdminManage) {
            $stageId = isset($valid['stage_id']) ? (int) $valid['stage_id'] : null;
            if ($stageId !== null) {
                $allowedIds = collect(VolunteerPipelineBootstrap::adminWorkflowStagesForChurch($churchId))
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
                abort_unless(in_array($stageId, $allowedIds, true), 422, 'Fase principal inválida.');
            }

            VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

            $update = ['admin_workflow_stage_id' => $stageId];
            if ($stageId !== null) {
                $update['stage_id'] = $stageId;
            }

            VolunteerChurchPipeline::query()
                ->where('volunteer_id', $volunteer->id)
                ->where('church_id', $churchId)
                ->update($update);

            return back()->with('success', $stageId === null ? 'Fase principal removida.' : 'Fase principal atualizada.');
        }

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

        VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->update(['stage_id' => (int) $valid['stage_id']]);

        return back()->with('success', 'Fase atualizada.');
    }

    public function updateMinistryLeaderStatus(Request $request, Volunteer $volunteer, Ministry $ministry): RedirectResponse
    {
        $this->canUseMutate($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);
        abort_unless((int) $ministry->church_id === (int) $churchId, 404);

        $user = $request->user();
        $isAdminManage = $user?->can('volunteers.manage') === true;

        if (! $isAdminManage) {
            $leaderSet = array_flip($this->leaderMinistryIdsForChurch($request, $churchId));
            abort_unless(isset($leaderSet[(int) $ministry->id]), 403);
            abort_unless(
                $volunteer->ministries()->where('ministries.id', (int) $ministry->id)->exists(),
                404,
                'Voluntário não está neste departamento.'
            );
        }

        $invitation = $this->findOrCreateLeaderStatusInvitation(
            $churchId,
            (int) $volunteer->id,
            (int) $ministry->id,
            $user?->id,
        );

        app(ApplyVolunteerMinistryLeaderStatusUpdate::class)($request, $invitation);

        return back()->with('success', 'Status do departamento atualizado.');
    }

    public function destroyVolunteer(Request $request, Volunteer $volunteer): RedirectResponse
    {
        abort_unless($request->user()?->can('volunteers.manage'), 403);

        $churchId = $this->churchId($request);
        abort_unless($churchId, 404);
        abort_unless($this->volunteerVisibleInChurch($volunteer, $churchId), 404);

        $deleteLinkedUser = $request->boolean('delete_linked_user');
        $linkedUser = $deleteLinkedUser ? User::query()->find($volunteer->user_id) : null;

        if ($linkedUser) {
            if ((int) $linkedUser->id === (int) $request->user()?->id) {
                return redirect()->route('ministry-lead.volunteers.index')->with('error', 'Não pode apagar a sua própria conta desta forma.');
            }
            if ($linkedUser->canAccessAdminMenu()) {
                return redirect()->route('ministry-lead.volunteers.index')->with('error', 'Não é possível apagar este usuário: tem acesso ao painel de equipe.');
            }
        }

        try {
            app(DeleteVolunteer::class)($volunteer, $deleteLinkedUser && $linkedUser !== null);
        } catch (\Throwable $e) {
            report($e);

            return redirect()->route('ministry-lead.volunteers.index')->with(
                'error',
                'Não foi possível excluir o voluntário. Tente novamente ou contate a equipe técnica.'
            );
        }

        $message = ($deleteLinkedUser && $linkedUser)
            ? 'Voluntário e conta de usuário removidos com sucesso.'
            : 'Voluntário removido com sucesso.';

        return redirect()->route('ministry-lead.volunteers.index')->with('success', $message);
    }

    /**
     * @param  array<int, true>  $attachedSet
     * @param  array<int, true>  $leaderSet
     * @return list<array<string, mixed>>
     */
    private function statusHistoryByMinistryForVolunteer(
        Volunteer $volunteer,
        int $churchId,
        array $attachedSet,
        array $leaderSet,
        bool $canManageAll,
    ): array {
        if (! Schema::hasTable('volunteer_ministry_invitations')) {
            return [];
        }

        $attachedMinistries = $volunteer->ministries
            ->filter(fn (Ministry $m) => (int) $m->church_id === $churchId)
            ->keyBy('id');

        $invitations = VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteer->id)
            ->with([
                'ministry:id,name,church_id',
                'leaderStatusHistory' => fn ($h) => $h->with('changedBy:id,name')->orderByDesc('created_at')->orderByDesc('id')->limit(50),
            ])
            ->get()
            ->keyBy('ministry_id');

        $ministryIds = collect($attachedMinistries->keys())
            ->merge($invitations->keys())
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sortBy(fn ($id) => mb_strtolower($attachedMinistries->get($id)?->name ?? $invitations->get($id)?->ministry?->name ?? ''))
            ->values();

        $sections = [];
        foreach ($ministryIds as $ministryId) {
            $ministry = $attachedMinistries->get($ministryId) ?? $invitations->get($ministryId)?->ministry;
            $inv = $invitations->get($ministryId);
            $isAttached = isset($attachedSet[$ministryId]);
            $canEdit = $canManageAll || ($isAttached && isset($leaderSet[$ministryId]));

            $sections[] = [
                'ministryId' => $ministryId,
                'ministryName' => $ministry?->name ?? 'Departamento',
                'isAttached' => $isAttached,
                'canEdit' => $canEdit,
                'currentLeaderStatus' => $inv?->leader_status,
                'currentLeaderNote' => $inv?->leader_note,
                'currentLeaderStatusLabel' => \App\Support\VolunteerLeaderStatusLabels::label($inv?->leader_status),
                'updateLeaderStatusUrl' => $canEdit
                    ? route('ministry-lead.volunteers.pipeline.ministry-leader-status', [$volunteer, $ministryId])
                    : null,
                'history' => $inv
                    ? $inv->leaderStatusHistory
                        ->map(fn (VolunteerMinistryInvitationStatusHistory $h) => [
                            'id' => $h->id,
                            'fromStatus' => $h->from_status,
                            'toStatus' => $h->to_status,
                            'fromStatusLabel' => \App\Support\VolunteerLeaderStatusLabels::label($h->from_status),
                            'toStatusLabel' => \App\Support\VolunteerLeaderStatusLabels::label($h->to_status),
                            'note' => $h->note,
                            'changedAt' => $h->created_at?->toIso8601String(),
                            'changedBy' => $h->changedBy?->name,
                        ])
                        ->values()
                        ->all()
                    : [],
            ];
        }

        return $sections;
    }

    private function invitationForVolunteerMinistry(int $churchId, int $volunteerId, int $ministryId): ?VolunteerMinistryInvitation
    {
        return VolunteerMinistryInvitation::query()
            ->where('church_id', $churchId)
            ->where('volunteer_id', $volunteerId)
            ->where('ministry_id', $ministryId)
            ->orderByDesc('id')
            ->first();
    }

    private function findOrCreateLeaderStatusInvitation(
        int $churchId,
        int $volunteerId,
        int $ministryId,
        ?int $invitedByUserId,
        string $defaultLeaderStatus = '',
    ): VolunteerMinistryInvitation {
        $existing = $this->invitationForVolunteerMinistry($churchId, $volunteerId, $ministryId);
        if ($existing) {
            return $existing;
        }

        return VolunteerMinistryInvitation::create([
            'church_id' => $churchId,
            'volunteer_id' => $volunteerId,
            'ministry_id' => $ministryId,
            'invited_by_user_id' => $invitedByUserId,
            'token' => VolunteerMinistryInvitation::createToken(),
            'status' => 'accepted',
            'accepted_at' => now(),
            'leader_status' => $defaultLeaderStatus !== '' ? $defaultLeaderStatus : null,
            'leader_status_set_by_user_id' => $invitedByUserId,
            'leader_status_set_at' => now(),
        ]);
    }
}
