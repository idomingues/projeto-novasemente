<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerPipelineStage;
use App\Models\VolunteerSelfSignupToken;
use App\Support\VolunteerChurchRosterBuilder;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerSignupDetailPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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

        return Inertia::render('MinistryLeadVolunteers/Pipeline', [
            'stages' => $stages,
            'volunteers' => $volunteers,
            'filters' => $filters,
            'ministries' => $ministries,
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

        return response()->json([
            'volunteer' => VolunteerSignupDetailPresenter::forVolunteer($volunteer),
            'pipeline' => [
                'stageId' => $pipe?->stage_id,
                'stageName' => $pipe?->stage?->name,
            ],
            'stages' => $stages,
            'notes' => $notes,
            'updateStageUrl' => route('ministry-lead.volunteers.pipeline.stage', $volunteer),
            'storeNoteUrl' => route('ministry-lead.volunteers.pipeline.notes.store', $volunteer),
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
}
