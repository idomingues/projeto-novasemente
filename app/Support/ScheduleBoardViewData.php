<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\ScheduleCheckinDate;
use App\Models\ScheduleRole;
use App\Models\User;
use App\Models\Volunteer;
use App\Services\ScheduleAssignmentPresenter;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ScheduleBoardViewData
{
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
            || $user->hasRole('lider_ministerio');
    }

    /**
     * @return array{
     *     assignments: array<int, array<string, mixed>>,
     *     checkinEnabledDates: array<int, string>,
     *     month: int,
     *     year: int,
     *     ministryId: int|null,
     *     ministries: array<int, array{id: int, name: string}>,
     *     canEdit: bool,
     *     scheduleVolunteers: array<int, array{volunteerId: int, memberId: int|null, name: string}>,
     *     scheduleRoles: array<int, array{id: int, name: string, ministryId: int|null}>
     * }
     */
    public static function forIndexRequest(Request $request): array
    {
        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);
        $ministryId = $request->input('ministry_id') ? (int) $request->input('ministry_id') : null;
        $churchId = Church::where('active', true)->orderBy('name')->value('id');
        $user = $request->user();

        $ministriesQuery = Ministry::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name');

        if ($user && $user->hasRole('lider_ministerio') && ! $user->hasRole('admin') && ! $user->hasRole('super_admin')) {
            $leaderMinistryIds = $user->ministries()->pluck('ministries.id')->toArray();
            if (count($leaderMinistryIds) > 0) {
                $ministriesQuery->whereIn('id', $leaderMinistryIds);
            } else {
                $ministriesQuery->whereRaw('1 = 0');
            }
        }

        /** @var Collection<int, Ministry> $ministries */
        $ministries = $ministriesQuery->get(['id', 'name']);

        if ($user && $user->hasRole('lider_ministerio') && ! $user->hasRole('admin') && ! $user->hasRole('super_admin') && $ministries->count() === 1 && $ministryId === null) {
            $ministryId = $ministries->first()->id;
        }

        $assignments = [];
        $checkinDates = [];
        $scheduleVolunteers = [];

        if ($ministryId) {
            $startDate = Carbon::create($year, $month, 1);
            $endDate = $startDate->copy()->endOfMonth()->addDay();

            $assignments = ScheduleAssignmentPresenter::monthAssignmentsForMinistry(
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
                ])
                ->values()
                ->all();

            $scheduleRoles = self::rolesForMinistry($ministryId);
        } else {
            $scheduleRoles = [];
        }

        $canEdit = false;
        if ($user) {
            if ($user->hasRole('admin') || $user->hasRole('super_admin') || $user->can('escalas.manage')) {
                $canEdit = true;
            } elseif ($user->hasRole('lider_ministerio') && $ministryId) {
                $canEdit = $user->ministries()->where('ministries.id', $ministryId)->exists();
            }
        }

        return [
            'assignments' => $assignments,
            'checkinEnabledDates' => $checkinDates,
            'month' => $month,
            'year' => $year,
            'ministryId' => $ministryId,
            'ministries' => $ministries->map(fn (Ministry $m) => ['id' => $m->id, 'name' => $m->name])->values()->all(),
            'canEdit' => $canEdit,
            'scheduleVolunteers' => $scheduleVolunteers,
            'scheduleRoles' => $scheduleRoles,
        ];
    }
}
