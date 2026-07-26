<?php

namespace App\Support;

use App\Models\User;
use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class LeaderVolunteerBirthdays
{
    /**
     * Ministérios da área do usuário: liderança (`ministry_user`) ∪ voluntariado (`ministry_volunteer`).
     *
     * @return list<int>
     */
    public static function ministryIdsForUser(User $user, int $churchId): array
    {
        $asLeader = $user->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $asVolunteer = [];
        $volunteer = $user->volunteerProfile;
        if ($volunteer) {
            $asVolunteer = $volunteer->ministries()
                ->where('church_id', $churchId)
                ->pluck('ministries.id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return array_values(array_unique(array_merge($asLeader, $asVolunteer)));
    }

    public static function canAccess(User $user, int $churchId): bool
    {
        if (NsWhatsAccess::isMinistryLeaderAccount($user)) {
            return true;
        }

        if ((bool) ($user->is_volunteer ?? false)) {
            return true;
        }

        return self::ministryIdsForUser($user, $churchId) !== [];
    }

    /**
     * Voluntários ativos da área com aniversário no mês.
     * Usa `volunteers.birth_date`, com fallback para `users.birth_date`.
     *
     * @param  list<int>  $ministryIds
     * @return list<array{
     *     id: int,
     *     name: string,
     *     photoUrl: string|null,
     *     birthDate: string,
     *     day: int,
     *     isToday: bool,
     *     ministryNames: list<string>,
     *     userId: int|null,
     *     ministryId: int|null,
     *     canCongratulate: bool,
     *     congratulateUrl: string|null
     * }>
     */
    public static function forMonth(
        int $churchId,
        array $ministryIds,
        ?Carbon $reference = null,
        ?int $excludeUserId = null,
    ): array {
        if ($ministryIds === []) {
            return [];
        }

        $reference ??= now();
        $month = (int) $reference->month;
        $todayMonth = (int) now()->month;
        $todayDay = (int) now()->day;
        $isCurrentMonth = $month === $todayMonth && (int) $reference->year === (int) now()->year;

        /** @var Collection<int, Volunteer> $volunteers */
        $volunteers = Volunteer::query()
            ->where('active', true)
            ->when(
                $excludeUserId !== null,
                fn ($q) => $q->where(function ($inner) use ($excludeUserId) {
                    $inner->whereNull('user_id')->orWhere('user_id', '!=', $excludeUserId);
                }),
            )
            ->whereHas(
                'ministries',
                fn ($q) => $q->where('ministries.church_id', $churchId)->whereIn('ministries.id', $ministryIds),
            )
            ->where(function ($q) use ($month) {
                $q->where(function ($inner) use ($month) {
                    $inner->whereNotNull('birth_date')
                        ->whereMonth('birth_date', $month);
                })->orWhere(function ($inner) use ($month) {
                    $inner->whereNull('birth_date')
                        ->whereHas('user', fn ($uq) => $uq->whereNotNull('birth_date')->whereMonth('birth_date', $month));
                });
            })
            ->with([
                'user:id,photo_url,birth_date,name',
                'ministries' => fn ($q) => $q
                    ->where('ministries.church_id', $churchId)
                    ->whereIn('ministries.id', $ministryIds)
                    ->select('ministries.id', 'ministries.name'),
            ])
            ->orderBy('name')
            ->get(['id', 'user_id', 'name', 'birth_date']);

        return $volunteers
            ->map(function (Volunteer $v) use ($isCurrentMonth, $todayDay, $excludeUserId) {
                $birth = $v->birth_date ?? $v->user?->birth_date;
                if ($birth === null) {
                    return null;
                }

                $day = (int) $birth->day;
                $isToday = $isCurrentMonth && $day === $todayDay;
                $userId = $v->user_id !== null ? (int) $v->user_id : null;
                $sharedMinistry = $v->ministries->first();
                $ministryId = $sharedMinistry ? (int) $sharedMinistry->id : null;
                $canCongratulate = $userId !== null
                    && $ministryId !== null
                    && ($excludeUserId === null || $userId !== $excludeUserId);

                return [
                    'id' => (int) $v->id,
                    'name' => (string) ($v->name ?: 'Sem nome'),
                    'photoUrl' => $v->user?->photo_url,
                    'birthDate' => $birth->toDateString(),
                    'day' => $day,
                    'isToday' => $isToday,
                    'ministryNames' => $v->ministries
                        ->pluck('name')
                        ->filter()
                        ->map(fn ($n) => (string) $n)
                        ->values()
                        ->all(),
                    'userId' => $userId,
                    'ministryId' => $ministryId,
                    'canCongratulate' => $canCongratulate,
                    'congratulateUrl' => $canCongratulate
                        ? route('mobile.ns-whats.index', [
                            'nova' => 1,
                            'ministry' => $ministryId,
                            'recipient' => $userId,
                            'mensagem' => 'Feliz aniversário!',
                        ])
                        : null,
                ];
            })
            ->filter()
            ->sortBy([
                fn (array $row) => $row['isToday'] ? 0 : 1,
                fn (array $row) => $row['day'],
                fn (array $row) => mb_strtolower($row['name']),
            ])
            ->values()
            ->all();
    }
}
