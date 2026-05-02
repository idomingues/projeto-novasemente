<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerPipelineStage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Lista paginada de voluntários visíveis na igreja (pipeline / secretaria),
 * com os mesmos filtros que {@see VolunteerLeadRosterFilters}.
 */
class VolunteerChurchRosterBuilder
{
    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function volunteersVisibleInChurchQuery(int $churchId): Builder
    {
        // Uma só igreja na BD (comum em local / restore): não filtrar por ministério — evita lista vazia
        // quando `ministries.church_id` ficou desalinhado do `churches.id` após import.
        if (Church::query()->count() <= 1) {
            return Volunteer::query();
        }

        return Volunteer::query()
            ->where(function ($q2) use ($churchId) {
                $q2->whereDoesntHave('ministries')
                    ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId))
                    ->orWhereHas('churchPipelines', fn ($p) => $p->where('church_id', $churchId));
            });
    }

    /**
     * @return array{email: string|null, phone: string|null, piiMasked: bool}
     */
    public static function maskContactForUser(?User $user, ?string $email, ?string $phone): array
    {
        if ($user?->can('volunteers.manage')) {
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

    private static function truncateInterestPreview(Volunteer $v): ?string
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

    /**
     * @return array{
     *     stages: list<array{id: int, name: string, sort_order: int, volunteer_count: int}>,
     *     volunteers: LengthAwarePaginator,
     *     filters: array<string, string>,
     *     ministries: list<array{id: int, name: string}>
     * }
     */
    public static function paginated(
        Request $request,
        int $churchId,
        ?User $user,
        int $perPage = 25,
        bool $alwaysShowFullContact = false,
    ): array {
        $q = self::volunteersVisibleInChurchQuery($churchId)
            ->with([
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with('stage'),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->where('status', 'pending'),
            ]);

        VolunteerLeadRosterFilters::apply($request, $q, $churchId);

        $volunteers = $q->orderByDesc('volunteers.created_at')->paginate($perPage)->withQueryString();

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
            $volunteers->getCollection()->map(function (Volunteer $v) use ($user, $churchId, $alwaysShowFullContact) {
                $pipe = $v->churchPipelines->firstWhere('church_id', $churchId);
                $stage = $pipe?->stage;
                $mask = $alwaysShowFullContact
                    ? ['email' => $v->email, 'phone' => $v->phone, 'piiMasked' => false]
                    : self::maskContactForUser($user, $v->email, $v->phone);
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
                    'interestPreview' => self::truncateInterestPreview($v),
                    'signals' => [
                        'memberNs' => $signals['memberNs'],
                        'sixMonthsInChurchOrLetter' => $signals['sixMonthsInChurchOrLetter'],
                        'ministryExperienceDeclared' => $signals['ministryExperienceDeclared'],
                    ],
                ];
            }),
        );

        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Ministry $m) => ['id' => $m->id, 'name' => $m->name])
            ->values()
            ->all();

        return [
            'stages' => $stages,
            'volunteers' => $volunteers,
            'filters' => VolunteerLeadRosterFilters::filterState($request),
            'ministries' => $ministries,
        ];
    }

    public static function volunteersTableExists(): bool
    {
        return Schema::hasTable('volunteers');
    }
}
