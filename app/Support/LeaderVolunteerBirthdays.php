<?php

namespace App\Support;

use App\Models\User;
use App\Models\Volunteer;
use Carbon\Carbon;
use Carbon\CarbonInterface;
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
            ->where('ministries.church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $asVolunteer = [];
        $volunteer = $user->volunteerProfile;
        if ($volunteer) {
            $asVolunteer = $volunteer->ministries()
                ->where('ministries.church_id', $churchId)
                ->pluck('ministries.id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return array_values(array_unique(array_merge($asLeader, $asVolunteer)));
    }

    public static function isChurchAdmin(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin']);
    }

    public static function canAccess(User $user, int $churchId): bool
    {
        if (self::isChurchAdmin($user)) {
            return true;
        }

        if (NsWhatsAccess::isMinistryLeaderAccount($user)) {
            return true;
        }

        if ((bool) ($user->is_volunteer ?? false)) {
            return true;
        }

        return self::ministryIdsForUser($user, $churchId) !== [];
    }

    /**
     * Voluntários ativos da área (ou de toda a igreja, se `$allChurch`) com aniversário no mês.
     * Usa `volunteers.birth_date`, com fallback para `users.birth_date`.
     * O visualizador permanece na lista; `$viewerUserId` só impede "Dar parabéns" a si mesmo.
     *
     * @param  list<int>  $ministryIds
     * @param  'day'|'name'  $sortBy
     * @return list<array{
     *     id: int,
     *     name: string,
     *     photoUrl: string|null,
     *     birthDate: string,
     *     day: int,
     *     isToday: bool,
     *     isSelf: bool,
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
        ?int $viewerUserId = null,
        bool $allChurch = false,
        string $sortBy = 'day',
    ): array {
        if (! $allChurch && $ministryIds === []) {
            return [];
        }

        $reference ??= now();
        $month = (int) $reference->month;
        $todayMonth = (int) now()->month;
        $todayDay = (int) now()->day;
        $isCurrentMonth = $month === $todayMonth && (int) $reference->year === (int) now()->year;
        $sortBy = $sortBy === 'name' ? 'name' : 'day';

        /** @var Collection<int, Volunteer> $volunteers */
        $volunteers = Volunteer::query()
            ->where('active', true)
            ->whereHas(
                'ministries',
                function ($q) use ($churchId, $ministryIds, $allChurch) {
                    $q->where('ministries.church_id', $churchId);
                    if (! $allChurch) {
                        $q->whereIn('ministries.id', $ministryIds);
                    }
                },
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
                'ministries' => function ($q) use ($churchId, $ministryIds, $allChurch) {
                    $q->where('ministries.church_id', $churchId)
                        ->select('ministries.id', 'ministries.name');
                    if (! $allChurch) {
                        $q->whereIn('ministries.id', $ministryIds);
                    }
                },
            ])
            ->orderBy('name')
            ->get(['id', 'user_id', 'name', 'birth_date']);

        $rows = $volunteers
            ->map(function (Volunteer $v) use ($isCurrentMonth, $todayDay, $viewerUserId) {
                $parts = self::calendarDateParts(
                    $v->birth_date ?? $v->user?->birth_date,
                    $v->getAttributes()['birth_date'] ?? $v->user?->getAttributes()['birth_date'] ?? null,
                );
                if ($parts === null) {
                    return null;
                }

                $day = $parts['day'];
                $isToday = $isCurrentMonth && $day === $todayDay;
                $userId = $v->user_id !== null ? (int) $v->user_id : null;
                $isSelf = $viewerUserId !== null && $userId !== null && $userId === $viewerUserId;
                $sharedMinistry = $v->ministries->first();
                $ministryId = $sharedMinistry ? (int) $sharedMinistry->id : null;
                $canCongratulate = $userId !== null
                    && $ministryId !== null
                    && ! $isSelf;

                return [
                    'id' => (int) $v->id,
                    'name' => (string) ($v->name ?: 'Sem nome'),
                    'photoUrl' => $v->user?->photo_url,
                    'birthDate' => $parts['ymd'],
                    'day' => $day,
                    'isToday' => $isToday,
                    'isSelf' => $isSelf,
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
            ->filter();

        if ($sortBy === 'name') {
            return $rows
                ->sortBy(fn (array $row) => mb_strtolower($row['name']), SORT_NATURAL)
                ->values()
                ->all();
        }

        return $rows
            ->sortBy(fn (array $row) => [
                $row['isToday'] ? 0 : 1,
                $row['day'],
                mb_strtolower($row['name']),
            ])
            ->values()
            ->all();
    }

    /**
     * Extrai Y-m-d e dia do mês a partir do valor cru do banco (DATE),
     * evitando deslocamento de fuso ao ler Carbon.
     *
     * @return array{ymd: string, day: int}|null
     */
    private static function calendarDateParts(?CarbonInterface $birth, mixed $raw): ?array
    {
        if (is_string($raw) && preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $raw, $m) === 1) {
            return [
                'ymd' => $m[1].'-'.$m[2].'-'.$m[3],
                'day' => (int) $m[3],
            ];
        }

        if ($birth === null) {
            return null;
        }

        return [
            'ymd' => $birth->toDateString(),
            'day' => (int) $birth->day,
        ];
    }
}
