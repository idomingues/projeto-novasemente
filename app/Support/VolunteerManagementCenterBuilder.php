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

/**
 * Dados da Central de Gestão de Voluntários (departamentos + lista sem paginação).
 */
class VolunteerManagementCenterBuilder
{
    private const MAX_VOLUNTEERS = 500;

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
        $counts = [];
        foreach (self::phaseSidebarDefinitions() as $def) {
            $counts[$def['key']] = 0;
        }

        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->with([
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId),
            ]);

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['name', 'email', 'phone'], $search);
        }

        $q->select(['volunteers.id'])->chunkById(200, function ($chunk) use (&$counts, $churchId) {
            foreach ($chunk as $volunteer) {
                foreach (self::phaseKeysForVolunteer($volunteer, $churchId) as $key) {
                    if (isset($counts[$key])) {
                        $counts[$key]++;
                    }
                }
            }
        });

        $rows = [];
        foreach (self::phaseSidebarDefinitions() as $def) {
            $rows[] = [
                'key' => $def['key'],
                'label' => $def['label'],
                'volunteerCount' => (int) ($counts[$def['key']] ?? 0),
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
     *     volunteerCount: int
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

        $ministryIds = $ministries->pluck('id')->map(fn ($id) => (int) $id)->all();

        $attachedCounts = DB::table('ministry_volunteer')
            ->join('volunteers', 'volunteers.id', '=', 'ministry_volunteer.volunteer_id')
            ->whereIn('ministry_volunteer.ministry_id', $ministryIds)
            ->where('volunteers.app_access_only', false)
            ->groupBy('ministry_volunteer.ministry_id')
            ->pluck(DB::raw('COUNT(*)'), 'ministry_volunteer.ministry_id')
            ->map(fn ($c) => (int) $c)
            ->all();

        $rows = [];
        foreach ($ministries as $m) {
            $leaders = $m->users
                ->map(fn (User $u) => trim((string) $u->name))
                ->filter(fn ($n) => $n !== '')
                ->values()
                ->all();

            $rows[] = [
                'id' => (int) $m->id,
                'name' => $m->name,
                'icon' => $m->icon,
                'leaders' => $leaders,
                'volunteerCount' => (int) ($attachedCounts[(int) $m->id] ?? 0),
            ];
        }

        return $rows;
    }

    public static function volunteersWithoutDepartmentCount(Request $request, int $churchId): int
    {
        $q = VolunteerChurchRosterBuilder::volunteersVisibleInChurchQuery($churchId)
            ->whereDoesntHave('ministries', fn ($mq) => $mq->where('church_id', $churchId));

        if (Schema::hasTable('volunteer_ministry_invitations')) {
            $q->whereDoesntHave('ministryInvitations', fn ($iq) => $iq->where('church_id', $churchId));
        }

        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['name', 'email', 'phone'], $search);
        }

        return (int) $q->count();
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
