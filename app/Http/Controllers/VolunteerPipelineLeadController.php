<?php

namespace App\Http\Controllers;

use App\Domain\Volunteers\Actions\SyncVolunteerMinistryAttachments;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\Volunteer;
use App\Models\VolunteerClearanceCheck;
use App\Models\VolunteerMinistryInvitation;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerPipelineStage;
use App\Models\VolunteerSelfSignupToken;
use App\Models\User;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerSignupDetailPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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

    public function index(Request $request): Response
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $user = $request->user();
        $roster = VolunteerChurchRosterBuilder::paginated($request, (int) $churchId, $user, 25, false);
        $stages = $roster['stages'];
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

        return Inertia::render('MinistryLeadVolunteers/Pipeline', [
            'stages' => $stages,
            'volunteers' => $volunteers,
            'filters' => $filters,
            'ministries' => $ministries,
            'encaminharMinistryIds' => $encaminharMinistryIds,
            'storeStageUrl' => route('ministry-lead.volunteers.pipeline.stages.store'),
            'canVolunteerManage' => $user && $user->can('volunteers.manage'),
            'canPipelineMutate' => $user && ($user->can('volunteers.manage') || $user->can('volunteers.ministry_operate')),
            'volunteersAdminUrl' => route('volunteers.index'),
            'publicVolunteerSignupUrl' => $publicVolunteerSignupUrl,
        ]);
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
            'user:id,email,name',
            'user.roles:id,name',
            'user.ministries:id,name',
            'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with('stage'),
        ]);

        $pipe = $volunteer->churchPipelines->firstWhere('church_id', $churchId);
        $stages = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'sort_order'])
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

        return response()->json([
            'volunteer' => VolunteerSignupDetailPresenter::forVolunteer($volunteer),
            'pipeline' => [
                'stageId' => $pipe?->stage_id,
                'stageName' => $pipe?->stage?->name,
            ],
            'stages' => $stages,
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
        ]);
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

        $valid = $request->validate([
            'stage_id' => ['required', 'integer', Rule::exists('volunteer_pipeline_stages', 'id')->where('church_id', $churchId)],
        ]);

        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($volunteer, $churchId);

        VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->update(['stage_id' => (int) $valid['stage_id']]);

        return back()->with('success', 'Fase atualizada.');
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
                return redirect()->route('ministry-lead.volunteers.index')->with('error', 'Não é possível apagar este utilizador: tem acesso ao painel de equipa.');
            }
        }

        DB::transaction(function () use ($volunteer, $linkedUser) {
            $volunteer->delete();
            if ($linkedUser) {
                $linkedUser->delete();
            }
        });

        $message = ($deleteLinkedUser && $linkedUser)
            ? 'Voluntário e conta de utilizador removidos com sucesso.'
            : 'Voluntário removido com sucesso.';

        return redirect()->route('ministry-lead.volunteers.index')->with('success', $message);
    }
}
