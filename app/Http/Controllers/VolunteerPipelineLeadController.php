<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerPipelineStage;
use App\Models\VolunteerSelfSignupToken;
use App\Models\VolunteerMinistryInvitation;
use App\Models\Ministry;
use App\Support\VolunteerLeadRosterFilters;
use App\Support\VolunteerPipelineBootstrap;
use App\Support\VolunteerRosterSignals;
use App\Support\VolunteerSignupDetailPresenter;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * @param  Builder<Volunteer>  $q
     */
    private function volunteersVisibleInChurchQuery(int $churchId): Builder
    {
        return Volunteer::query()
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            });
    }

    private function volunteerVisibleInChurch(Volunteer $volunteer, int $churchId): bool
    {
        return $this->volunteersVisibleInChurchQuery($churchId)
            ->whereKey($volunteer->getKey())
            ->exists();
    }

    private function maskForLeader(Request $request, ?string $email, ?string $phone): array
    {
        if ($request->user()?->can('volunteers.manage')) {
            return [
                'email' => $email,
                'phone' => $phone,
                'piiMasked' => false,
            ];
        }

        $e = is_string($email) && $email !== '' ? $email : null;
        $maskedEmail = $e !== null && str_contains($e, '@')
            ? (mb_substr($e, 0, 1).'***@'.explode('@', $e, 2)[1])
            : ($e !== null ? '***' : null);

        $p = is_string($phone) && trim($phone) !== '' ? preg_replace('/\D+/', '', $phone) : '';
        $maskedPhone = $p !== '' && strlen($p) >= 4
            ? '***'.substr($p, -4)
            : ($phone !== null && trim((string) $phone) !== '' ? '***' : null);

        return [
            'email' => $maskedEmail,
            'phone' => $maskedPhone,
            'piiMasked' => true,
        ];
    }

    private function truncateInterestPreview(Volunteer $v): ?string
    {
        $parts = array_filter([
            $v->other_ministry_interest,
            $v->ministry_involvement,
            $v->gifts_to_develop,
        ], fn ($t) => is_string($t) && trim($t) !== '');

        if ($parts === []) {
            return null;
        }

        $text = implode(' · ', array_map(fn ($p) => trim((string) $p), $parts));

        return mb_strlen($text) > 120 ? mb_substr($text, 0, 117).'…' : $text;
    }

    public function index(Request $request): Response
    {
        $this->canUseRead($request);
        $churchId = $this->churchId($request);
        abort_unless($churchId, 404, 'Nenhuma igreja ativa.');

        $q = $this->volunteersVisibleInChurchQuery($churchId)
            ->with([
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with('stage'),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->where('status', 'pending'),
            ]);

        VolunteerLeadRosterFilters::apply($request, $q, $churchId);

        $volunteers = $q->orderByDesc('volunteers.created_at')->paginate(25)->withQueryString();

        $stages = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->withCount([
                'churchPipelines as volunteer_count' => fn ($sq) => $sq->where('church_id', $churchId),
            ])
            ->get()
            ->map(fn (VolunteerPipelineStage $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'sort_order' => $s->sort_order,
                'volunteer_count' => (int) $s->volunteer_count,
            ])
            ->values()
            ->all();

        $volunteers->setCollection(
            $volunteers->getCollection()->map(function (Volunteer $v) use ($request, $churchId) {
                $pipe = $v->churchPipelines->firstWhere('church_id', $churchId);
                $stage = $pipe?->stage;
                $mask = $this->maskForLeader($request, $v->email, $v->phone);
                $signals = VolunteerRosterSignals::forVolunteer($v);
                $hasPendingInvite = $v->ministryInvitations->isNotEmpty();

                return [
                    'id' => $v->id,
                    'name' => $v->name,
                    'email' => $mask['email'],
                    'phone' => $mask['phone'],
                    'active' => (bool) $v->active,
                    'createdAt' => $v->created_at?->toIso8601String(),
                    'stageId' => $stage?->id,
                    'stageName' => $hasPendingInvite ? 'Aguardando' : ($stage?->name ?? 'Não definido'),
                    'pendingInvite' => $hasPendingInvite,
                    'ministryNames' => $v->ministries->pluck('name')->values()->all(),
                    'interestPreview' => $this->truncateInterestPreview($v),
                    'signals' => [
                        'memberNs' => $signals['memberNs'],
                        'sixMonthsInChurchOrLetter' => $signals['sixMonthsInChurchOrLetter'],
                        'ministryExperienceDeclared' => $signals['ministryExperienceDeclared'],
                    ],
                ];
            }),
        );

        $publicVolunteerSignupUrl = null;
        if ($churchId !== null && Schema::hasTable('volunteer_self_signup_tokens')) {
            try {
                $publicVolunteerSignupUrl = VolunteerSelfSignupToken::ensurePublicSignupUrl($churchId);
            } catch (\Throwable) {
                $publicVolunteerSignupUrl = null;
            }
        }

        $user = $request->user();

        return Inertia::render('MinistryLeadVolunteers/Pipeline', [
            'stages' => $stages,
            'volunteers' => $volunteers,
            'filters' => VolunteerLeadRosterFilters::filterState($request),
            'ministries' => Ministry::query()
                ->where('church_id', $churchId)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Ministry $m) => ['id' => $m->id, 'name' => $m->name])
                ->values()
                ->all(),
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
