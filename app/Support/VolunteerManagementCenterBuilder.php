<?php

namespace App\Support;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerMinistryInvitation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Support\VolunteerLeadRosterFilters;
use App\Support\VolunteerChurchRosterBuilder;

/**
 * Dados da Central de Gestão de Voluntários (departamentos + lista sem paginação).
 */
class VolunteerManagementCenterBuilder
{
    private const MAX_VOLUNTEERS = 500;

    public static function normalizedCenterVinculo(Request $request): string
    {
        $raw = trim((string) $request->input('center_vinculo', $request->query('vinculo', 'vinculados')));

        return in_array($raw, ['vinculados', 'encaminhados'], true) ? $raw : 'vinculados';
    }

    /**
     * Contagens da lateral (departamentos, fases, «Todos») não devem seguir busca da lista.
     * Mantém filtros do quadro (fase do pipeline, cadastro, etc.).
     */
    private static function requestForSidebarCounts(Request $request): Request
    {
        $rq = clone $request;
        $rq->merge([
            'search' => '',
            'text_interest' => '',
        ]);

        return $rq;
    }

    /**
     * @param  list<int>  $ministryIds
     * @return array<int, int>
     */
    private static function attachedVolunteerCountsByMinistry(Request $request, int $churchId, array $ministryIds): array
    {
        if ($ministryIds === [] || ! Schema::hasTable('ministry_volunteer')) {
            return [];
        }

        $rq = self::requestForSidebarCounts($request);
        $rq->merge([
            'center_mode' => '1',
            'center_phase_key' => '',
            'center_sem_departamento' => '',
            'pipeline_stage_id' => '',
            'ministry_ids' => '',
        ]);

        $volunteerSub = VolunteerChurchRosterBuilder::boardFilteredVolunteerQuery($rq, $churchId)
            ->select('volunteers.id');

        $rows = DB::table('ministry_volunteer as mv')
            ->joinSub($volunteerSub, 'vf', 'vf.id', '=', 'mv.volunteer_id')
            ->join('ministries as m', function ($join) use ($churchId) {
                $join->on('m.id', '=', 'mv.ministry_id')
                    ->where('m.church_id', '=', $churchId);
            })
            ->whereIn('m.id', $ministryIds)
            ->groupBy('m.id')
            ->selectRaw('m.id as ministry_id, COUNT(DISTINCT vf.id) as aggregate')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->ministry_id] = (int) $row->aggregate;
        }

        return $out;
    }

    /**
     * @param  list<int>  $ministryIds
     * @return array<int, int>
     */
    private static function forwardedVolunteerCountsByMinistry(Request $request, int $churchId, array $ministryIds): array
    {
        if ($ministryIds === [] || ! Schema::hasTable('volunteer_ministry_invitations')) {
            return [];
        }

        $rq = self::requestForSidebarCounts($request);
        $rq->merge([
            'center_mode' => '1',
            'center_phase_key' => '',
            'center_sem_departamento' => '',
            'pipeline_stage_id' => '',
            'ministry_ids' => '',
        ]);

        $volunteerSub = VolunteerChurchRosterBuilder::boardFilteredVolunteerQuery($rq, $churchId)
            ->select('volunteers.id');

        $rows = DB::table('volunteer_ministry_invitations as inv')
            ->joinSub($volunteerSub, 'vf', 'vf.id', '=', 'inv.volunteer_id')
            ->where('inv.church_id', $churchId)
            ->whereIn('inv.ministry_id', $ministryIds)
            ->whereNotExists(function ($sub) {
                $sub->selectRaw('1')
                    ->from('ministry_volunteer as mv')
                    ->whereColumn('mv.volunteer_id', 'vf.id')
                    ->whereColumn('mv.ministry_id', 'inv.ministry_id');
            })
            ->groupBy('inv.ministry_id')
            ->selectRaw('inv.ministry_id as ministry_id, COUNT(DISTINCT vf.id) as aggregate')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[(int) $row->ministry_id] = (int) $row->aggregate;
        }

        return $out;
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    public static function phaseSidebarDefinitions(): array
    {
        return [
            ['key' => 'training', 'label' => VolunteerLeaderStatusLabels::label('training')],
            ['key' => 'ready', 'label' => VolunteerLeaderStatusLabels::label('ready')],
            ['key' => 'active', 'label' => VolunteerLeaderStatusLabels::label('active')],
            ['key' => 'reviewing', 'label' => VolunteerLeaderStatusLabels::label('reviewing')],
            ['key' => 'denied', 'label' => VolunteerLeaderStatusLabels::label('denied')],
            ['key' => 'attached', 'label' => 'Vinculado'],
            ['key' => 'invite_pending', 'label' => 'Convite pendente'],
            ['key' => 'sem_departamento', 'label' => 'Sem departamento'],
        ];
    }

    /**
     * @return list<array{key: string, label: string, volunteerCount: int}>
     */
    public static function phasesWithCounts(Request $request, int $churchId): array
    {
        // Contagens exatas: cada fase deve bater com a lista quando clicada.
        // Isso exige contar "pessoas únicas" (DISTINCT volunteers.id) com a mesma lógica do filtro + fase.
        $filtersRequest = self::requestForSidebarCounts($request);
        $filtersRequest->merge(['center_mode' => '1']);

        $rows = [];
        foreach (self::phaseSidebarDefinitions() as $def) {
            $rq = clone $filtersRequest;
            $rq->merge(['center_phase_key' => (string) $def['key']]);

            $q = VolunteerChurchRosterBuilder::boardFilteredVolunteerQuery($rq, $churchId);

            $rows[] = [
                'key' => $def['key'],
                'label' => $def['label'],
                'volunteerCount' => (int) $q->distinct('volunteers.id')->count('volunteers.id'),
            ];
        }

        return $rows;
    }

    /**
     * @return list<string>
     */
    public static function phaseKeysForVolunteer(Volunteer $volunteer, int $churchId): array
    {
        $attached = $volunteer->ministries
            ->filter(fn (Ministry $m) => (int) $m->church_id === $churchId)
            ->keyBy('id');

        $invitations = Schema::hasTable('volunteer_ministry_invitations')
            ? $volunteer->ministryInvitations
                ->filter(fn (VolunteerMinistryInvitation $inv) => (int) $inv->church_id === $churchId)
                ->keyBy('ministry_id')
            : collect();

        /** @var Collection<int, int> $ministryIds */
        $ministryIds = $attached->keys()
            ->merge($invitations->keys())
            ->map(fn ($id) => (int) $id)
            ->unique();

        if ($ministryIds->isEmpty()) {
            return ['sem_departamento'];
        }

        $keys = [];
        foreach ($ministryIds as $ministryId) {
            $inv = $invitations->get($ministryId);
            $isAttached = $attached->has($ministryId);
            $key = self::resolveDepartmentPhaseKey($inv, $isAttached);
            if ($key !== null && $key !== '') {
                $keys[] = $key;
            }
        }

        return $keys === [] ? ['invite_pending'] : array_values(array_unique($keys));
    }

    private static function resolveDepartmentPhaseKey(?VolunteerMinistryInvitation $inv, bool $attached): ?string
    {
        if ($inv !== null) {
            $leaderStatus = $inv->leader_status;
            if (is_string($leaderStatus) && $leaderStatus !== '') {
                return $leaderStatus;
            }
            if ($inv->status === 'pending') {
                return 'invite_pending';
            }
        }

        if ($attached) {
            return 'attached';
        }

        return null;
    }

    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function applyCenterPhaseFilter(Builder $q, int $churchId, string $phaseKey): void
    {
        if ($phaseKey === 'sem_departamento') {
            $q->whereDoesntHave('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            if (Schema::hasTable('volunteer_ministry_invitations')) {
                $q->whereDoesntHave('ministryInvitations', fn ($iq) => $iq->where('church_id', $churchId));
            }

            return;
        }

        $q->where(function ($outer) use ($churchId, $phaseKey) {
            if ($phaseKey === 'attached') {
                $outer->whereHas('ministries', fn ($m) => $m->where('church_id', $churchId));

                return;
            }

            if (! Schema::hasTable('volunteer_ministry_invitations')) {
                return;
            }

            if ($phaseKey === 'invite_pending') {
                $outer->whereHas('ministryInvitations', function ($i) use ($churchId) {
                    $i->where('church_id', $churchId)
                        ->where('status', 'pending')
                        ->where(function ($ls) {
                            $ls->whereNull('leader_status')->orWhere('leader_status', '');
                        });
                });

                return;
            }

            if (in_array($phaseKey, ['training', 'ready', 'active', 'reviewing', 'denied'], true)) {
                $outer->whereHas('ministryInvitations', fn ($i) => $i
                    ->where('church_id', $churchId)
                    ->where('leader_status', $phaseKey));
            }
        });
    }

    public static function volunteerMatchesPhaseKey(Volunteer $volunteer, int $churchId, string $phaseKey): bool
    {
        if ($phaseKey === 'sem_departamento') {
            return self::phaseKeysForVolunteer($volunteer, $churchId) === ['sem_departamento'];
        }

        return in_array($phaseKey, self::phaseKeysForVolunteer($volunteer, $churchId), true);
    }

    /**
     * @return Builder<Ministry>
     */
    public static function visibleMinistriesQuery(Request $request, int $churchId): Builder
    {
        $q = Ministry::query()->where('church_id', $churchId);
        $user = $request->user();
        if ($user === null) {
            return $q->whereRaw('1 = 0');
        }
        if ($user->can('volunteers.manage') || $user->can('volunteers.view')) {
            return $q;
        }
        if ($user->can('volunteers.ministry_operate')) {
            $ids = $user->ministries()
                ->where('church_id', $churchId)
                ->pluck('ministries.id')
                ->map(fn ($id) => (int) $id)
                ->all();
            if ($ids === []) {
                return $q->whereRaw('1 = 0');
            }

            return $q->whereIn('id', $ids);
        }

        return $q->whereRaw('1 = 0');
    }

    /**
     * @return list<array{
     *     id: int,
     *     name: string,
     *     icon: string|null,
     *     leaders: list<string>,
     *     volunteerCount: int,
     *     forwardedCount: int
     * }>
     */
    public static function departments(Request $request, int $churchId): array
    {
        $ministries = self::visibleMinistriesQuery($request, $churchId)
            ->with(['users:id,name'])
            ->orderBy('name')
            ->get(['id', 'name', 'icon']);

        if ($ministries->isEmpty()) {
            return [];
        }

        $ministryIds = $ministries->map(fn (Ministry $m) => (int) $m->id)->values()->all();
        $attachedCounts = self::attachedVolunteerCountsByMinistry($request, $churchId, $ministryIds);
        $forwardedCounts = self::forwardedVolunteerCountsByMinistry($request, $churchId, $ministryIds);

        $rows = [];
        foreach ($ministries as $m) {
            $leaders = $m->users
                ->map(fn (User $u) => trim((string) $u->name))
                ->filter(fn ($n) => $n !== '')
                ->values()
                ->all();

            $ministryId = (int) $m->id;

            $rows[] = [
                'id' => $ministryId,
                'name' => $m->name,
                'icon' => $m->icon,
                'leaders' => $leaders,
                'volunteerCount' => (int) ($attachedCounts[$ministryId] ?? 0),
                'forwardedCount' => (int) ($forwardedCounts[$ministryId] ?? 0),
            ];
        }

        return $rows;
    }

    public static function allVolunteersCount(Request $request, int $churchId): int
    {
        // Total de pessoas únicas na igreja (com filtros do quadro), sem recorte da lateral nem busca.
        $rq = self::requestForSidebarCounts($request);
        $rq->merge([
            'center_mode' => '1',
            'ministry_ids' => '',
            'center_phase_key' => '',
            'center_sem_departamento' => '',
            'pipeline_stage_id' => '',
        ]);
        $q = VolunteerChurchRosterBuilder::boardFilteredVolunteerQuery($rq, $churchId);

        return (int) $q->distinct('volunteers.id')->count('volunteers.id');
    }

    public static function volunteersWithoutDepartmentCount(Request $request, int $churchId): int
    {
        // Contagem exata com os mesmos filtros do roster (exceto busca da lista).
        $rq = self::requestForSidebarCounts($request);
        $rq->merge([
            'center_mode' => '1',
            'ministry_ids' => '',
            'center_phase_key' => '',
            'pipeline_stage_id' => '',
            'center_sem_departamento' => '1',
        ]);
        $q = VolunteerChurchRosterBuilder::boardFilteredVolunteerQuery($rq, $churchId);

        return (int) $q->distinct('volunteers.id')->count('volunteers.id');
    }

    /**
     * @return array{
     *     volunteers: list<array<string, mixed>>,
     *     truncated: bool,
     *     ministry: array{id: int, name: string, icon: string|null, leaders: list<string>}|null
     * }
     */
    public static function volunteersForMinistry(
        Request $request,
        int $churchId,
        ?User $user,
        ?Ministry $ministry,
    ): array {
        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->with([
                'user:id,email,photo_url',
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->with('ministry:id,name,church_id'),
            ]);

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['name', 'email', 'phone'], $search);
        }

        if ($ministry === null) {
            $q->whereDoesntHave('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            if (Schema::hasTable('volunteer_ministry_invitations')) {
                $q->whereDoesntHave('ministryInvitations', fn ($iq) => $iq->where('church_id', $churchId));
            }
            $ministryPayload = null;
        } else {
            $ministryId = (int) $ministry->id;
            $q->where(function ($sub) use ($ministryId, $churchId) {
                $sub->whereHas('ministries', fn ($mq) => $mq->where('ministries.id', $ministryId))
                    ->orWhereHas('ministryInvitations', fn ($iq) => $iq
                        ->where('church_id', $churchId)
                        ->where('ministry_id', $ministryId));
            });
            $ministry->loadMissing(['users:id,name']);
            $ministryPayload = [
                'id' => (int) $ministry->id,
                'name' => $ministry->name,
                'icon' => $ministry->icon,
                'leaders' => $ministry->users
                    ->map(fn (User $u) => trim((string) $u->name))
                    ->filter(fn ($n) => $n !== '')
                    ->values()
                    ->all(),
            ];
        }

        $total = (int) $q->count();
        $truncated = $total > self::MAX_VOLUNTEERS;

        $collection = $q->orderBy('volunteers.name')
            ->limit(self::MAX_VOLUNTEERS)
            ->get();

        $ministryName = $ministry?->name;

        $volunteers = $collection->map(function (Volunteer $v) use ($user, $churchId, $ministryName, $ministry) {
            $mask = VolunteerChurchRosterBuilder::maskContactForUser($user, $v->email, $v->phone);
            $phaseKey = null;
            $phaseLabel = '—';

            if ($ministry !== null) {
                $inv = $v->ministryInvitations->firstWhere('ministry_id', $ministry->id);
                $attached = $v->ministries->contains(fn (Ministry $m) => (int) $m->id === (int) $ministry->id);
                $phaseKey = self::resolveDepartmentPhaseKey($inv, $attached);
                if ($phaseKey !== null && $phaseKey !== '' && VolunteerLeaderStatusLabels::label($phaseKey) !== '—') {
                    $phaseLabel = VolunteerLeaderStatusLabels::label($phaseKey);
                } elseif ($phaseKey === 'attached') {
                    $phaseLabel = 'Vinculado';
                } elseif ($phaseKey === 'invite_pending' && $inv !== null) {
                    $phaseLabel = VolunteerInvitationStatusLabels::forInvitation($inv);
                } elseif ($inv !== null) {
                    $phaseLabel = VolunteerInvitationStatusLabels::forInvitation($inv);
                } elseif ($attached) {
                    $phaseLabel = 'Vinculado';
                    $phaseKey = 'attached';
                }
            } else {
                $phases = VolunteerChurchRosterBuilder::ministryPhasesForVolunteer($v, $churchId);
                $phaseLabel = $phases === [] ? 'Sem departamento' : 'Vários departamentos';
            }

            return [
                'id' => (int) $v->id,
                'name' => $v->name,
                'photoUrl' => $v->user?->photo_url,
                'hasUserAccount' => VolunteerAppLogin::loginReady($v),
                'email' => $mask['email'],
                'phone' => $mask['phone'],
                'active' => (bool) $v->active,
                'departmentPhaseLabel' => $phaseLabel,
                'departmentPhaseKey' => $phaseKey,
                'inDepartment' => $ministry !== null
                    ? $v->ministries->contains(fn (Ministry $m) => (int) $m->id === (int) $ministry->id)
                    : false,
            ];
        })->values()->all();

        return [
            'volunteers' => $volunteers,
            'truncated' => $truncated,
            'total' => $total,
            'ministry' => $ministryPayload,
        ];
    }

    /**
     * @return array{
     *     volunteers: list<array<string, mixed>>,
     *     truncated: bool,
     *     total: int,
     *     phase: array{key: string, label: string}|null
     * }
     */
    public static function volunteersForPhase(
        Request $request,
        int $churchId,
        ?User $user,
        string $phaseKey,
    ): array {
        $definitions = collect(self::phaseSidebarDefinitions())->keyBy('key');
        $phaseDef = $definitions->get($phaseKey);
        if ($phaseDef === null) {
            $phaseKey = (string) (self::phaseSidebarDefinitions()[0]['key'] ?? 'training');
            $phaseDef = $definitions->get($phaseKey);
        }

        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->with([
                'user:id,email,photo_url',
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->with('ministry:id,name,church_id'),
            ]);

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['name', 'email', 'phone'], $search);
        }

        $collection = $q->orderBy('volunteers.name')->get();
        $filtered = $collection->filter(
            fn (Volunteer $v) => self::volunteerMatchesPhaseKey($v, $churchId, $phaseKey),
        )->values();

        $total = $filtered->count();
        $truncated = $total > self::MAX_VOLUNTEERS;
        $slice = $filtered->take(self::MAX_VOLUNTEERS);
        $phaseLabel = (string) ($phaseDef['label'] ?? '—');

        $volunteers = $slice->map(function (Volunteer $v) use ($user, $churchId, $phaseKey, $phaseLabel) {
            $mask = VolunteerChurchRosterBuilder::maskContactForUser($user, $v->email, $v->phone);
            $ministryNames = self::ministryNamesForVolunteerInPhase($v, $churchId, $phaseKey);

            return [
                'id' => (int) $v->id,
                'name' => $v->name,
                'photoUrl' => $v->user?->photo_url,
                'hasUserAccount' => VolunteerAppLogin::loginReady($v),
                'email' => $mask['email'],
                'phone' => $mask['phone'],
                'active' => (bool) $v->active,
                'departmentPhaseLabel' => $phaseLabel,
                'departmentPhaseKey' => $phaseKey,
                'inDepartment' => $phaseKey !== 'sem_departamento',
                'contextLabel' => $ministryNames,
            ];
        })->values()->all();

        return [
            'volunteers' => $volunteers,
            'truncated' => $truncated,
            'total' => $total,
            'phase' => $phaseDef !== null
                ? ['key' => $phaseKey, 'label' => (string) $phaseDef['label']]
                : null,
        ];
    }

    private static function ministryNamesForVolunteerInPhase(Volunteer $v, int $churchId, string $phaseKey): string
    {
        if ($phaseKey === 'sem_departamento') {
            return '—';
        }

        $attached = $v->ministries->filter(fn (Ministry $m) => (int) $m->church_id === $churchId)->keyBy('id');
        $invitations = $v->ministryInvitations->filter(fn ($inv) => (int) $inv->church_id === $churchId)->keyBy('ministry_id');
        $names = [];

        foreach ($attached->keys()->merge($invitations->keys())->unique() as $ministryId) {
            $inv = $invitations->get($ministryId);
            $isAttached = $attached->has($ministryId);
            $key = self::resolveDepartmentPhaseKey($inv, $isAttached) ?? 'invite_pending';
            if ($key !== $phaseKey) {
                continue;
            }
            $name = trim((string) ($attached->get($ministryId)?->name ?? $inv?->ministry?->name ?? ''));
            if ($name !== '') {
                $names[] = $name;
            }
        }

        return $names === [] ? '—' : implode(', ', array_unique($names));
    }
}
