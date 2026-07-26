<?php

namespace App\Support;

use App\Models\Volunteer;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class LeaderVolunteerBirthdays
{
    /**
     * Voluntários ativos dos departamentos do líder com aniversário no mês indicado.
     * Usa `volunteers.birth_date`, com fallback para `users.birth_date`.
     *
     * @param  list<int>  $leaderMinistryIds
     * @return list<array{
     *     id: int,
     *     name: string,
     *     photoUrl: string|null,
     *     birthDate: string,
     *     day: int,
     *     isToday: bool,
     *     ministryNames: list<string>
     * }>
     */
    public static function forMonth(int $churchId, array $leaderMinistryIds, ?Carbon $reference = null): array
    {
        if ($leaderMinistryIds === []) {
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
            ->whereHas(
                'ministries',
                fn ($q) => $q->where('ministries.church_id', $churchId)->whereIn('ministries.id', $leaderMinistryIds),
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
                'user:id,photo_url,birth_date',
                'ministries' => fn ($q) => $q
                    ->where('ministries.church_id', $churchId)
                    ->whereIn('ministries.id', $leaderMinistryIds)
                    ->select('ministries.id', 'ministries.name'),
            ])
            ->orderBy('name')
            ->get(['id', 'user_id', 'name', 'birth_date']);

        return $volunteers
            ->map(function (Volunteer $v) use ($isCurrentMonth, $todayDay) {
                $birth = $v->birth_date ?? $v->user?->birth_date;
                if ($birth === null) {
                    return null;
                }

                $day = (int) $birth->day;
                $isToday = $isCurrentMonth && $day === $todayDay;

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
