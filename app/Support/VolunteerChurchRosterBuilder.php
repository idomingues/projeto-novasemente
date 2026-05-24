<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
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
        $query = Church::query()->count() <= 1
            ? Volunteer::query()
            : Volunteer::query()
                ->where(function ($q2) use ($churchId) {
                    $q2->whereDoesntHave('ministries')
                        ->orWhereHas('ministries', fn ($mq) => $mq->where('church_id', $churchId))
                        ->orWhereHas('churchPipelines', fn ($p) => $p->where('church_id', $churchId));
                });

        return $query->where('app_access_only', false);
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
                'user:id,email',
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with(['stage', 'adminWorkflowStage']),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->with('ministry:id,name,church_id'),
            ]);

        VolunteerLeadRosterFilters::apply($request, $q, $churchId);
        self::applyStaffArchivedFilter($q, $churchId, VolunteerLeadRosterFilters::showsArchivedRoster($request));
        VolunteerLeadRosterFilters::applySort(
            $request,
            $q,
            $churchId,
            (bool) $user?->can('volunteers.manage'),
        );

        $volunteers = $q->paginate($perPage)->withQueryString();

        $volunteerIds = $volunteers->getCollection()->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $forwardedMinistryIdsByVolunteer = Schema::hasTable('volunteer_ministry_invitations')
            ? \App\Models\VolunteerMinistryInvitation::blockingMinistryIdsByVolunteerIds($churchId, $volunteerIds)
            : [];

        VolunteerPipelineBootstrap::ensureRecusaStagesForChurch($churchId);
        $adminWorkflowBlankVolunteerCount = 0;
        if (Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
            $allowed = VolunteerPipelineBootstrap::adminWorkflowStageIdsForChurch($churchId);
            if ($allowed === []) {
                $allowed = [-1];
            }
            $adminWorkflowBlankVolunteerCount = VolunteerChurchPipeline::query()
                ->where('church_id', $churchId)
                ->whereNull('staff_archived_at')
                ->whereNull('admin_workflow_stage_id')
                ->where(function ($sub) use ($allowed) {
                    $sub->whereNull('stage_id')->orWhereNotIn('stage_id', $allowed);
                })
                ->whereHas('volunteer', fn ($vq) => $vq->where('app_access_only', false))
                ->count();
        }

        $stages = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->withCount([
                'churchPipelines as volunteer_count' => fn ($sq) => $sq
                    ->where('church_id', $churchId)
                    ->whereNull('staff_archived_at')
                    ->whereHas('volunteer', fn ($vq) => $vq->where('app_access_only', false)),
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

        $archivedVolunteerCount = 0;
        if (Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
            $archivedVolunteerCount = VolunteerChurchPipeline::query()
                ->where('church_id', $churchId)
                ->whereNotNull('staff_archived_at')
                ->whereHas('volunteer', fn ($vq) => $vq->where('app_access_only', false))
                ->count();
        }

        $volunteers->setCollection(
            $volunteers->getCollection()->map(function (Volunteer $v) use ($user, $churchId, $alwaysShowFullContact, $forwardedMinistryIdsByVolunteer) {
                $pipe = $v->churchPipelines->firstWhere('church_id', $churchId);
                $stage = $pipe?->stage;
                $mask = $alwaysShowFullContact
                    ? ['email' => $v->email, 'phone' => $v->phone, 'piiMasked' => false]
                    : self::maskContactForUser($user, $v->email, $v->phone);
                $signals = VolunteerRosterSignals::forVolunteer($v);
                $hasPendingInvite = $v->ministryInvitations->contains(fn ($inv) => $inv->isPending());
                $pendingInviteMinistryNames = $v->ministryInvitations
                    ->filter(fn ($inv) => $inv->isPending())
                    ->map(fn ($inv) => (string) ($inv->ministry?->name ?? ''))
                    ->filter(fn ($name) => trim($name) !== '')
                    ->sortBy(fn ($name) => mb_strtolower($name))
                    ->values()
                    ->all();
                $ministryPhases = self::ministryPhasesForVolunteer($v, $churchId);

                $adminWorkflowStageId = VolunteerPipelineBootstrap::resolveAdminWorkflowStageId(
                    $churchId,
                    $pipe?->admin_workflow_stage_id,
                );
                $effectiveAdminWorkflowStageId = VolunteerPipelineBootstrap::effectiveAdminWorkflowStageId(
                    $churchId,
                    $pipe?->admin_workflow_stage_id,
                    $pipe?->stage_id,
                );

                return [
                    'id' => $v->id,
                    'name' => $v->name,
                    'hasUserAccount' => VolunteerAppLogin::loginReady($v),
                    'email' => $mask['email'],
                    'phone' => $mask['phone'],
                    'active' => (bool) $v->active,
                    'createdAt' => $v->created_at?->toIso8601String(),
                    'stageId' => $stage?->id,
                    'stageName' => $stage?->name ?? 'Não definido',
                    'adminWorkflowStageId' => $adminWorkflowStageId,
                    'adminWorkflowStageName' => $effectiveAdminWorkflowStageId !== null
                        ? ($pipe?->adminWorkflowStage?->name ?? $stage?->name)
                        : null,
                    'pendingInvite' => $hasPendingInvite,
                    'pendingInviteMinistryNames' => array_values(array_unique($pendingInviteMinistryNames)),
                    'forwardedMinistryIds' => $forwardedMinistryIdsByVolunteer[(int) $v->id] ?? [],
                    'ministryNames' => $v->ministries->pluck('name')->values()->all(),
                    'ministryPhases' => $ministryPhases,
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
            'adminWorkflowBlankVolunteerCount' => $adminWorkflowBlankVolunteerCount,
            'archivedVolunteerCount' => $archivedVolunteerCount,
            'volunteers' => $volunteers,
            'filters' => VolunteerLeadRosterFilters::filterState($request),
            'ministries' => $ministries,
        ];
    }

    /**
     * @return list<array{ministryName: string, phaseLabel: string}>
     */
    public static function ministryPhasesForVolunteer(Volunteer $v, int $churchId): array
    {
        $attached = $v->ministries
            ->filter(fn (Ministry $m) => (int) $m->church_id === $churchId)
            ->keyBy('id');

        $invitations = Schema::hasTable('volunteer_ministry_invitations')
            ? $v->ministryInvitations
                ->filter(fn ($inv) => (int) $inv->church_id === $churchId)
                ->keyBy('ministry_id')
            : collect();

        $ministryIds = $attached->keys()
            ->merge($invitations->keys())
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sortBy(fn (int $id) => mb_strtolower(
                (string) ($attached->get($id)?->name ?? $invitations->get($id)?->ministry?->name ?? '')
            ))
            ->values();

        $rows = [];
        foreach ($ministryIds as $ministryId) {
            $ministry = $attached->get($ministryId) ?? $invitations->get($ministryId)?->ministry;
            $name = trim((string) ($ministry?->name ?? ''));
            if ($name === '') {
                continue;
            }

            $inv = $invitations->get($ministryId);
            if ($inv?->isPending()) {
                $phaseLabel = 'Convite pendente';
            } elseif ($inv?->leader_status !== null && $inv->leader_status !== '') {
                $phaseLabel = VolunteerLeaderStatusLabels::label($inv->leader_status);
            } else {
                $phaseLabel = '—';
            }

            $rows[] = [
                'ministryName' => $name,
                'phaseLabel' => $phaseLabel,
            ];
        }

        return $rows;
    }

    public static function volunteersTableExists(): bool
    {
        return Schema::hasTable('volunteers');
    }

    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function applyStaffArchivedFilter(Builder $q, int $churchId, bool $showArchived): void
    {
        if (! Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
            return;
        }

        if ($showArchived) {
            $q->whereHas('churchPipelines', fn ($p) => $p
                ->where('church_id', $churchId)
                ->whereNotNull('staff_archived_at'));

            return;
        }

        $q->where(function ($sub) use ($churchId) {
            $sub->whereDoesntHave('churchPipelines', fn ($p) => $p->where('church_id', $churchId))
                ->orWhereHas('churchPipelines', fn ($p) => $p
                    ->where('church_id', $churchId)
                    ->whereNull('staff_archived_at'));
        });
    }
}
