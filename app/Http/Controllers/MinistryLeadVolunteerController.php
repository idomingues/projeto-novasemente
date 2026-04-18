<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\Volunteer;
use App\Models\VolunteerClearanceCheck;
use App\Models\VolunteerClearanceCriterion;
use App\Services\VolunteerMinistryRosterNotifier;
use App\Support\VolunteerRosterAssistantHeuristics;
use App\Support\VolunteerRosterSignals;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MinistryLeadVolunteerController extends Controller
{
    public function __construct(
        private readonly VolunteerMinistryRosterNotifier $rosterNotifier,
    ) {}

    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function canUseRoster(Request $request): bool
    {
        $u = $request->user();
        abort_unless($u, 401);

        return $u->can('volunteers.ministry_operate') || $u->can('volunteers.manage');
    }

    private function leadsMinistryOrManage(Request $request, Ministry $ministry): bool
    {
        $u = $request->user();
        abort_unless($u, 401);

        if ($u->can('volunteers.manage')) {
            return (int) $ministry->church_id === (int) ($this->churchId($request) ?? 0);
        }

        return $u->can('volunteers.ministry_operate')
            && $u->ministries()->where('ministries.id', $ministry->id)->exists();
    }

    private function ensureMinistry(Request $request, Ministry $ministry): void
    {
        $this->canUseRoster($request);
        abort_unless($this->churchId($request) === (int) $ministry->church_id, 404);
        abort_unless($this->leadsMinistryOrManage($request, $ministry), 403);
    }

    private function volunteerInChurch(Volunteer $volunteer, int $churchId): bool
    {
        return Volunteer::query()
            ->whereKey($volunteer->getKey())
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->exists();
    }

    /** Mesma visibilidade que a lista global de voluntários (por igreja em contexto). */
    private function volunteersVisibleInChurchQuery(int $churchId): Builder
    {
        return Volunteer::query()
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            });
    }

    /**
     * @param  Builder<\App\Models\Volunteer>  $q
     */
    private function applyBoardFilters(Request $request, Builder $q, Ministry $ministry): void
    {
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            $q->where(function ($sub) use ($search) {
                $sub->where('name', 'like', '%'.$search.'%')
                    ->orWhere('email', 'like', '%'.$search.'%')
                    ->orWhere('phone', 'like', '%'.$search.'%');
            });
        }

        foreach ([
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'has_previous_ministry_volunteer_experience',
            'needs_pastoral_guidance',
            'lgpd_data_consent',
            'active',
            'app_access_only',
        ] as $boolField) {
            $v = $request->input($boolField);
            if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
                $q->where($boolField, (bool) (int) $v);
            }
        }

        $att = trim((string) $request->input('attendance_duration', ''));
        if ($att !== '') {
            $q->where('attendance_duration', 'like', '%'.$att.'%');
        }

        $cf = trim((string) $request->input('created_from', ''));
        if ($cf !== '' && strtotime($cf) !== false) {
            $q->whereDate('volunteers.created_at', '>=', $cf);
        }
        $ct = trim((string) $request->input('created_to', ''));
        if ($ct !== '' && strtotime($ct) !== false) {
            $q->whereDate('volunteers.created_at', '<=', $ct);
        }

        $ti = trim((string) $request->input('text_interest', ''));
        if ($ti !== '' && mb_strlen($ti) >= 2) {
            $like = '%'.$ti.'%';
            $q->where(function ($sub) use ($like) {
                $sub->where('ministry_involvement', 'like', $like)
                    ->orWhere('other_ministry_interest', 'like', $like)
                    ->orWhere('gifts_to_develop', 'like', $like)
                    ->orWhere('previous_ministry_details', 'like', $like);
            });
        }

        $inMin = (string) $request->input('in_ministry', 'any');
        if ($inMin === 'yes') {
            $q->whereHas('ministries', fn ($mq) => $mq->where('ministries.id', $ministry->id));
        } elseif ($inMin === 'no') {
            $q->whereDoesntHave('ministries', fn ($mq) => $mq->where('ministries.id', $ministry->id));
        }
    }

    /**
     * @return array<string, string>
     */
    private function boardFilterState(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'has_whatsapp' => (string) $request->input('has_whatsapp', ''),
            'has_social_networks' => (string) $request->input('has_social_networks', ''),
            'is_official_member' => (string) $request->input('is_official_member', ''),
            'has_previous_ministry_volunteer_experience' => (string) $request->input('has_previous_ministry_volunteer_experience', ''),
            'needs_pastoral_guidance' => (string) $request->input('needs_pastoral_guidance', ''),
            'lgpd_data_consent' => (string) $request->input('lgpd_data_consent', ''),
            'active' => (string) $request->input('active', ''),
            'app_access_only' => (string) $request->input('app_access_only', ''),
            'attendance_duration' => trim((string) $request->input('attendance_duration', '')),
            'created_from' => trim((string) $request->input('created_from', '')),
            'created_to' => trim((string) $request->input('created_to', '')),
            'text_interest' => trim((string) $request->input('text_interest', '')),
            'in_ministry' => (string) $request->input('in_ministry', 'any'),
        ];
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

    public function board(Request $request, Ministry $ministry): Response
    {
        $this->ensureMinistry($request, $ministry);
        $churchId = (int) $this->churchId($request);

        $q = $this->volunteersVisibleInChurchQuery($churchId)
            ->with(['ministries']);

        $this->applyBoardFilters($request, $q, $ministry);

        $volunteers = $q->orderByDesc('volunteers.created_at')->paginate(20)->withQueryString();

        $criteria = VolunteerClearanceCriterion::query()
            ->where('ministry_id', $ministry->id)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (VolunteerClearanceCriterion $c) => [
                'id' => $c->id,
                'label' => $c->label,
                'sort_order' => $c->sort_order,
                'destroyUrl' => route('ministry-lead.volunteers.criteria.destroy', [$ministry, $c]),
            ])
            ->values()
            ->all();

        $volunteers->setCollection(
            $volunteers->getCollection()->map(function (Volunteer $v) use ($ministry, $criteria, $request, $churchId) {
                $inThisMinistry = $v->ministries->contains(fn (Ministry $m) => (int) $m->id === (int) $ministry->id);
                $pivot = $v->ministries->firstWhere('id', $ministry->id)?->pivot;
                $clearanceStatus = $pivot?->clearance_status ?? 'pending';

                $metCount = $inThisMinistry
                    ? VolunteerClearanceCheck::query()
                        ->where('volunteer_id', $v->id)
                        ->where('ministry_id', $ministry->id)
                        ->count()
                    : 0;

                $mask = $this->maskForLeader($request, $v->email, $v->phone);
                $ministryNames = $v->ministries
                    ->where('church_id', $churchId)
                    ->pluck('name')
                    ->values()
                    ->all();
                $signals = VolunteerRosterSignals::forVolunteer($v);

                return [
                    'id' => $v->id,
                    'name' => $v->name,
                    'email' => $mask['email'],
                    'phone' => $mask['phone'],
                    'active' => (bool) $v->active,
                    'createdAt' => $v->created_at?->toIso8601String(),
                    'inThisMinistry' => $inThisMinistry,
                    'ministryNames' => $ministryNames,
                    'interestPreview' => $this->truncateInterestPreview($v),
                    'signals' => [
                        'memberNs' => $signals['memberNs'],
                        'sixMonthsInChurchOrLetter' => $signals['sixMonthsInChurchOrLetter'],
                        'ministryExperienceDeclared' => $signals['ministryExperienceDeclared'],
                    ],
                    'clearanceStatus' => $clearanceStatus,
                    'criteriaMet' => $metCount,
                    'criteriaTotal' => count($criteria),
                    'showUrl' => $inThisMinistry ? route('ministry-lead.volunteers.show', [$ministry, $v]) : null,
                ];
            }),
        );

        return Inertia::render('MinistryLeadVolunteers/Board', [
            'ministry' => ['id' => $ministry->id, 'name' => $ministry->name],
            'criteria' => $criteria,
            'volunteers' => $volunteers,
            'filters' => $this->boardFilterState($request),
            'indexUrl' => route('ministry-lead.volunteers.index'),
            'storeCriterionUrl' => route('ministry-lead.volunteers.criteria.store', $ministry),
            'attachVolunteerUrl' => route('ministry-lead.volunteers.attach', $ministry),
            'lookupVolunteersUrl' => route('ministry-lead.volunteers.lookup', $ministry),
            'assistantUrl' => route('ministry-lead.volunteers.assistant', $ministry),
        ]);
    }

    public function assistant(Request $request, Ministry $ministry): JsonResponse
    {
        $this->ensureMinistry($request, $ministry);
        $valid = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $out = VolunteerRosterAssistantHeuristics::interpret($valid['message']);

        return response()->json([
            'reply' => $out['reply'],
            'filters' => $out['filters'],
        ]);
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

        return mb_strlen($text) > 140 ? mb_substr($text, 0, 137).'…' : $text;
    }

    public function lookup(Request $request, Ministry $ministry): JsonResponse
    {
        $this->ensureMinistry($request, $ministry);
        $churchId = (int) $this->churchId($request);
        $q = trim((string) $request->input('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $volunteers = Volunteer::query()
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            })
            ->whereDoesntHave('ministries', fn ($mq) => $mq->where('ministries.id', $ministry->id))
            ->where(function ($sub) use ($q) {
                $sub->where('name', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%');
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'email']);

        $mask = fn (Volunteer $v) => $this->maskForLeader($request, $v->email, $v->phone);

        return response()->json([
            'results' => $volunteers->map(fn (Volunteer $v) => [
                'id' => $v->id,
                'name' => $v->name,
                'email' => $mask($v)['email'],
            ])->values()->all(),
        ]);
    }

    public function attach(Request $request, Ministry $ministry): RedirectResponse
    {
        $this->ensureMinistry($request, $ministry);
        $churchId = (int) $this->churchId($request);

        $valid = $request->validate([
            'volunteer_id' => ['required', 'integer', 'exists:volunteers,id'],
        ]);

        $volunteer = Volunteer::query()->findOrFail((int) $valid['volunteer_id']);
        abort_unless($this->volunteerInChurch($volunteer, $churchId), 404);
        abort_if($volunteer->ministries()->where('ministries.id', $ministry->id)->exists(), 422);

        $volunteer->ministries()->attach($ministry->id, [
            'clearance_status' => 'pending',
            'cleared_at' => null,
            'cleared_by_user_id' => null,
        ]);

        $this->rosterNotifier->notifyLeadersOfNewAttachments($volunteer, [$ministry->id]);

        return redirect()->route('ministry-lead.volunteers.board', $ministry)
            ->with('success', 'Voluntário associado ao ministério.');
    }

    public function show(Request $request, Ministry $ministry, Volunteer $volunteer): Response
    {
        $this->ensureMinistry($request, $ministry);
        $churchId = (int) $this->churchId($request);
        abort_unless($volunteer->ministries()->where('ministries.id', $ministry->id)->exists(), 404);
        abort_unless($this->volunteerInChurch($volunteer, $churchId), 404);

        $volunteer->load(['member:id,name', 'ministries' => fn ($q) => $q->where('ministries.id', $ministry->id)]);

        $criteria = VolunteerClearanceCriterion::query()
            ->where('ministry_id', $ministry->id)
            ->where('active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $checks = VolunteerClearanceCheck::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->get()
            ->keyBy('criterion_id');

        $pivot = $volunteer->ministries->first()?->pivot;
        $signals = VolunteerRosterSignals::forVolunteer($volunteer);
        $mask = $this->maskForLeader($request, $volunteer->email, $volunteer->phone);

        return Inertia::render('MinistryLeadVolunteers/Show', [
            'ministry' => ['id' => $ministry->id, 'name' => $ministry->name],
            'volunteer' => [
                'id' => $volunteer->id,
                'name' => $volunteer->name,
                'email' => $mask['email'],
                'phone' => $mask['phone'],
                'piiMasked' => $mask['piiMasked'],
                'active' => (bool) $volunteer->active,
                'memberName' => $volunteer->member?->name,
                'signals' => $signals,
                'clearanceStatus' => $pivot?->clearance_status ?? 'pending',
            ],
            'criteria' => $criteria->map(fn (VolunteerClearanceCriterion $c) => [
                'id' => $c->id,
                'label' => $c->label,
                'checked' => $checks->has($c->id),
                'checkedAt' => $checks->get($c->id)?->checked_at?->toIso8601String(),
                'toggleUrl' => route('ministry-lead.volunteers.checks.toggle', [$ministry, $volunteer, $c]),
            ])->values()->all(),
            'boardUrl' => route('ministry-lead.volunteers.board', $ministry),
            'updateClearanceUrl' => route('ministry-lead.volunteers.clearance', [$ministry, $volunteer]),
        ]);
    }

    public function storeCriterion(Request $request, Ministry $ministry): RedirectResponse
    {
        $this->ensureMinistry($request, $ministry);

        $valid = $request->validate([
            'label' => ['required', 'string', 'max:255'],
        ]);

        $maxOrder = (int) VolunteerClearanceCriterion::query()->where('ministry_id', $ministry->id)->max('sort_order');

        VolunteerClearanceCriterion::create([
            'ministry_id' => $ministry->id,
            'label' => $valid['label'],
            'sort_order' => $maxOrder + 1,
            'active' => true,
        ]);

        return redirect()->route('ministry-lead.volunteers.board', $ministry)
            ->with('success', 'Critério adicionado.');
    }

    public function destroyCriterion(Request $request, Ministry $ministry, VolunteerClearanceCriterion $criterion): RedirectResponse
    {
        $this->ensureMinistry($request, $ministry);
        abort_unless((int) $criterion->ministry_id === (int) $ministry->id, 404);

        $criterion->delete();

        return redirect()->route('ministry-lead.volunteers.board', $ministry)
            ->with('success', 'Critério removido.');
    }

    public function toggleCheck(Request $request, Ministry $ministry, Volunteer $volunteer, VolunteerClearanceCriterion $criterion): RedirectResponse
    {
        $this->ensureMinistry($request, $ministry);
        abort_unless((int) $criterion->ministry_id === (int) $ministry->id, 404);
        abort_unless($volunteer->ministries()->where('ministries.id', $ministry->id)->exists(), 404);

        $user = $request->user();
        abort_unless($user, 401);

        $existing = VolunteerClearanceCheck::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('ministry_id', $ministry->id)
            ->where('criterion_id', $criterion->id)
            ->first();

        if ($existing) {
            $existing->delete();
        } else {
            VolunteerClearanceCheck::create([
                'volunteer_id' => $volunteer->id,
                'ministry_id' => $ministry->id,
                'criterion_id' => $criterion->id,
                'checked_by_user_id' => $user->id,
                'checked_at' => now(),
            ]);
        }

        return redirect()->route('ministry-lead.volunteers.show', [$ministry, $volunteer])
            ->with('success', 'Critério atualizado.');
    }

    public function updateClearance(Request $request, Ministry $ministry, Volunteer $volunteer): RedirectResponse
    {
        $this->ensureMinistry($request, $ministry);
        abort_unless($volunteer->ministries()->where('ministries.id', $ministry->id)->exists(), 404);

        $valid = $request->validate([
            'clearance_status' => ['required', 'in:pending,cleared,blocked'],
        ]);

        $user = $request->user();
        abort_unless($user, 401);

        $extra = [
            'clearance_status' => $valid['clearance_status'],
        ];
        if ($valid['clearance_status'] === 'cleared') {
            $extra['cleared_at'] = now();
            $extra['cleared_by_user_id'] = $user->id;
        } else {
            $extra['cleared_at'] = null;
            $extra['cleared_by_user_id'] = null;
        }

        $volunteer->ministries()->updateExistingPivot($ministry->id, $extra);

        return redirect()->route('ministry-lead.volunteers.show', [$ministry, $volunteer])
            ->with('success', 'Estado de liberação atualizado.');
    }
}
