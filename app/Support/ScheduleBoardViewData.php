<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleAssignment;
use App\Models\ScheduleCheckinDate;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\ScheduleAssignmentPresenter;
use App\Services\ScheduleCoordinatorPresenter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ScheduleBoardViewData
{
    private static function isMinistryLeaderAccount(User $user): bool
    {
        return $user->isMinistryLeaderAccount();
    }

    public static function userPhotoPublicUrl(?User $user): ?string
    {
        if (! $user || empty($user->photo_url)) {
            return null;
        }
        $u = $user->photo_url;
        if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) {
            return $u;
        }
        $base = request()->getSchemeAndHttpHost();

        return $base.(str_starts_with($u, '/') ? '' : '/').$u;
    }

    /**
     * @return array<int, array{id: int, name: string, ministryId: int|null}>
     */
    private static function rolesForMinistry(int $ministryId): array
    {
        return ScheduleRole::query()
            ->where('ministry_id', $ministryId)
            ->orderBy('name')
            ->get(['id', 'name', 'ministry_id'])
            ->map(fn (ScheduleRole $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'ministryId' => $r->ministry_id,
            ])
            ->all();
    }

    public static function userSeesMinistryScheduleBoard(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->hasRole('admin')
            || $user->hasRole('super_admin')
            || $user->can('escalas.manage')
            || self::isMinistryLeaderAccount($user)
            || ScheduleCoordinatorAccess::isCoordinatorAccount($user);
    }

    /**
     * @return array{
     *     assignments: array<int, array<string, mixed>>,
     *     coordinators: array<int, array<string, mixed>>,
     *     checkinEnabledDates: array<int, string>,
     *     month: int,
     *     year: int,
     *     ministryId: int|null,
     *     ministries: array<int, array{id: int, name: string, usesSchedule: bool}>,
     *     canEdit: bool,
     *     canAssignCoordinator: bool,
     *     editableSaturdayNumbers: array<int, int>,
     *     editableExtraDates: array<int, string>,
     *     scheduleVolunteers: array<int, array{volunteerId: int, memberId: int|null, name: string, hasAppAccount: bool}>,
     *     scheduleRoles: array<int, array{id: int, name: string, ministryId: int|null}>
     * }
     */
    public static function forIndexRequest(Request $request): array
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;
        // Usa a igreja "trabalhando em" (sessão) para manter consistência com o restante do painel.
        $churchId = Church::resolveWorkingId($request);
        $user = $request->user();

        $ministriesQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name');

        $isLeaderScoped = $user
            && self::isMinistryLeaderAccount($user)
            && ! $user->hasRole('admin')
            && ! $user->hasRole('super_admin');
        // Líderes recebem escalas.manage no Gate::before — não contar isso como quadro irrestrito.
        $isUnrestrictedBoard = $user && (
            $user->hasRole('admin')
            || $user->hasRole('super_admin')
            || (! $isLeaderScoped && $user->can('escalas.manage'))
        );
        $coordMinistryIds = $user ? ScheduleCoordinatorAccess::coordinatedMinistryIds($user) : [];

        if ($user && ! $isUnrestrictedBoard) {
            $scopedIds = [];
            if ($isLeaderScoped) {
                $scopedIds = array_merge(
                    $scopedIds,
                    $user->ministries()->pluck('ministries.id')->map(fn ($id) => (int) $id)->all()
                );
            }
            $scopedIds = array_values(array_unique(array_merge($scopedIds, $coordMinistryIds)));

            if ($scopedIds === [] && ! self::userSeesMinistryScheduleBoard($user)) {
                $user->loadMissing('volunteerProfile.ministries:id');
                $scopedIds = $user->volunteerProfile
                    ? $user->volunteerProfile->ministries->pluck('id')->map(fn ($id) => (int) $id)->values()->all()
                    : [];
            }

            if ($scopedIds !== []) {
                $ministriesQuery->whereIn('id', $scopedIds);
            } else {
                $ministriesQuery->whereRaw('1 = 0');
            }
        }

        /** @var Collection<int, Ministry> $ministries */
        $ministries = $ministriesQuery->get(['id', 'name']);

        $ministryIds = $ministries->pluck('id')->map(fn ($id) => (int) $id)->all();
        $usesScheduleMinistryIds = self::ministryIdsUsingSchedule($ministryIds);

        // Se só há 1 departamento disponível, seleciona automaticamente (evita tela em branco).
        if ($ministries->count() === 1 && $ministryId === null) {
            $ministryId = $ministries->first()->id;
        }

        $assignments = [];
        $coordinators = [];
        $checkinDates = [];
        $scheduleVolunteers = [];
        $editableSaturdayNumbers = [];
        $editableExtraDates = [];

        if ($ministryId) {
            $startDate = Carbon::create($year, $month, 1);
            $endDate = $startDate->copy()->endOfMonth()->addDay();

            $assignments = ScheduleAssignmentPresenter::monthAssignmentsForMinistry(
                $ministryId,
                $year,
                $month,
                fn ($u) => self::userPhotoPublicUrl($u)
            );

            $coordinators = ScheduleCoordinatorPresenter::monthCoordinatorsForMinistry(
                $ministryId,
                $year,
                $month,
                fn ($u) => self::userPhotoPublicUrl($u)
            );

            $checkinDates = ScheduleCheckinDate::query()
                ->where('schedule_date', '>=', $startDate)
                ->where('schedule_date', '<', $endDate)
                ->pluck('schedule_date')
                ->map(fn ($d) => Carbon::parse($d)->format('Y-m-d'))
                ->values()
                ->all();

            $scheduleVolunteers = Volunteer::query()
                ->whereHas('ministries', fn ($q) => $q->where('ministries.id', $ministryId))
                ->where('active', true)
                ->with('user')
                ->orderBy('name')
                ->get()
                ->map(fn (Volunteer $v) => [
                    'volunteerId' => (int) $v->id,
                    'memberId' => $v->user_id !== null ? (int) $v->user_id : null,
                    'name' => $v->display_name,
                    'hasAppAccount' => $v->user_id !== null,
                ])
                ->values()
                ->all();

            $scheduleRoles = self::rolesForMinistry($ministryId);

            $saturdays = ScheduleAssignmentPresenter::getSaturdays($year, $month);
            foreach ($saturdays as $i => $date) {
                $num = $i + 1;
                if (ScheduleCoordinatorAccess::canEditDay($user, $ministryId, $num, null, $year, $month)) {
                    $editableSaturdayNumbers[] = $num;
                }
            }
            foreach ($assignments as $a) {
                $extraDate = is_array($a) ? ($a['scheduleDate'] ?? null) : null;
                $satNum = is_array($a) ? ($a['saturdayNumber'] ?? null) : null;
                if ($extraDate && $satNum === null && ScheduleCoordinatorAccess::canEditDay($user, $ministryId, null, (string) $extraDate, $year, $month)) {
                    $editableExtraDates[] = (string) $extraDate;
                }
            }
            foreach ($coordinators as $c) {
                $extraDate = is_array($c) ? ($c['scheduleDate'] ?? null) : null;
                $satNum = is_array($c) ? ($c['saturdayNumber'] ?? null) : null;
                if ($extraDate && $satNum === null && ScheduleCoordinatorAccess::canEditDay($user, $ministryId, null, (string) $extraDate, $year, $month)) {
                    $editableExtraDates[] = (string) $extraDate;
                }
            }
            $editableExtraDates = array_values(array_unique($editableExtraDates));
        } else {
            $scheduleRoles = [];
        }

        $canAssignCoordinator = ScheduleCoordinatorAccess::canAssignCoordinator($user, $ministryId);
        $canEdit = $canAssignCoordinator || $editableSaturdayNumbers !== [] || $editableExtraDates !== [];

        return [
            'assignments' => $assignments,
            'coordinators' => $coordinators,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries->map(fn (Ministry $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'usesSchedule' => in_array((int) $m->id, $usesScheduleMinistryIds, true),
            ])->values()->all(),
            'canEdit' => $canEdit,
            'canAssignCoordinator' => $canAssignCoordinator,
            'editableSaturdayNumbers' => $editableSaturdayNumbers,
            'editableExtraDates' => $editableExtraDates,
            'scheduleVolunteers' => $scheduleVolunteers,
            'scheduleRoles' => $scheduleRoles,
        ];
    }

    /**
     * Departamentos com pelo menos uma atribuição com usuário ou voluntário vinculado.
     *
     * @param  array<int, int>  $ministryIds
     * @return array<int, int>
     */
    private static function ministryIdsUsingSchedule(array $ministryIds): array
    {
        if ($ministryIds === []) {
            return [];
        }

        return ScheduleAssignment::query()
            ->whereIn('ministry_id', $ministryIds)
            ->where(fn ($q) => $q->whereNotNull('user_id')->orWhereNotNull('volunteer_id'))
            ->distinct()
            ->pluck('ministry_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }
}
