<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerLeaderNote;
use App\Models\VolunteerPipelineStage;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

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
        $q = self::filteredRosterQuery($request, $churchId, $user);

        $volunteers = $q->paginate($perPage)->withQueryString();

        $volunteerIds = $volunteers->getCollection()->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
        $volunteerIdsWithLeaderNotes = $volunteerIds === []
            ? []
            : VolunteerLeaderNote::query()
                ->where('church_id', $churchId)
                ->whereIn('volunteer_id', $volunteerIds)
                ->distinct()
                ->pluck('volunteer_id')
                ->mapWithKeys(fn ($id) => [(int) $id => true])
                ->all();
        $forwardedMinistryIdsByVolunteer = Schema::hasTable('volunteer_ministry_invitations')
            ? \App\Models\VolunteerMinistryInvitation::blockingMinistryIdsByVolunteerIds($churchId, $volunteerIds)
            : [];
        $recentlyUpdatedCutoff = now()->subDays(15);

        $centerMode = $request->query('center_mode') === '1' || $request->input('center_mode') === '1';

        VolunteerPipelineBootstrap::ensureRecusaStagesForChurch($churchId);
        $adminWorkflowBlankVolunteerCount = 0;
        $archivedVolunteerCount = 0;
        $stages = [];

        if (! $centerMode) {
            if (Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
                $allowed = VolunteerPipelineBootstrap::adminWorkflowStageIdsForChurch($churchId);
                if ($allowed === []) {
                    $allowed = [-1];
                }
                $adminWorkflowBlankVolunteerCount = self::boardFilteredVolunteerQuery($request, $churchId)
                    ->whereHas('churchPipelines', fn ($p) => $p
                        ->where('church_id', $churchId)
                        ->whereNull('staff_archived_at')
                        ->whereNull('admin_workflow_stage_id')
                        ->where(function ($sub) use ($allowed) {
                            $sub->whereNull('stage_id')->orWhereNotIn('stage_id', $allowed);
                        }))
                    ->count();
            }

            $useAdminWorkflowStages = (bool) $user?->can('volunteers.manage');
            $adminWorkflowStageIds = VolunteerPipelineBootstrap::adminWorkflowStageIdsForChurch($churchId);
            $stageCountsById = self::filteredStageCountsById($request, $churchId, $user);
            $stages = VolunteerPipelineStage::query()
                ->where('church_id', $churchId)
                ->when(! $useAdminWorkflowStages, fn ($q) => $q->whereNotIn(
                    'id',
                    $adminWorkflowStageIds === [] ? [-1] : $adminWorkflowStageIds,
                ))
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'name', 'sort_order'])
                ->map(fn (VolunteerPipelineStage $s) => [
                    'id' => (int) $s->id,
                    'name' => $s->name,
                    'sort_order' => (int) $s->sort_order,
                    'volunteer_count' => (int) ($stageCountsById[(int) $s->id] ?? 0),
                ])
                ->values()
                ->all();

            if (Schema::hasColumn('volunteer_church_pipelines', 'staff_archived_at')) {
                $archivedVolunteerCount = self::boardFilteredVolunteerQuery($request, $churchId)
                    ->whereHas('churchPipelines', fn ($p) => $p
                        ->where('church_id', $churchId)
                        ->whereNotNull('staff_archived_at'))
                    ->count();
            }
        }

        $pipelineStagesById = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->get(['id', 'name'])
            ->keyBy('id');

        $volunteers->setCollection(
            $volunteers->getCollection()->map(function (Volunteer $v) use (
                $user,
                $churchId,
                $alwaysShowFullContact,
                $forwardedMinistryIdsByVolunteer,
                $pipelineStagesById,
                $recentlyUpdatedCutoff,
                $volunteerIdsWithLeaderNotes,
            ) {
                $pipe = $v->churchPipelines->firstWhere('church_id', $churchId);
                $stage = $pipe?->stage;
                $mask = $alwaysShowFullContact
                    ? ['email' => $v->email, 'phone' => $v->phone, 'piiMasked' => false]
                    : self::maskContactForUser($user, $v->email, $v->phone);
                $signals = VolunteerRosterSignals::forVolunteer($v);
                $hasPendingInvite = $v->ministryInvitations->contains(fn ($inv) => $inv->isPending());
                $hasLeaderNotes = (bool) ($volunteerIdsWithLeaderNotes[(int) $v->id] ?? false);
                $updatedAt = $v->updated_at?->toIso8601String();
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
                $leaderStageId = VolunteerPipelineBootstrap::leaderVisiblePipelineStageId($churchId, $pipe?->stage_id);
                $leaderStage = $leaderStageId !== null
                    ? $pipelineStagesById->get($leaderStageId)
                    : null;
                $rosterStageId = $user?->can('volunteers.manage') ? $stage?->id : $leaderStageId;
                $rosterStageName = $user?->can('volunteers.manage')
                    ? ($stage?->name ?? 'Não definido')
                    : ($leaderStage?->name ?? 'Não definido');

                return [
                    'id' => $v->id,
                    'name' => $v->name,
                    'photoUrl' => $v->user?->photo_url,
                    'hasUserAccount' => VolunteerAppLogin::loginReady($v),
                    'email' => $mask['email'],
                    'phone' => $mask['phone'],
                    'active' => (bool) $v->active,
                    'createdAt' => $v->created_at?->toIso8601String(),
                    'updatedAt' => $updatedAt,
                    'hasLeaderNotes' => $hasLeaderNotes,
                    'recentlyUpdated' => $v->updated_at !== null && $v->updated_at->greaterThanOrEqualTo($recentlyUpdatedCutoff),
                    'stageId' => $rosterStageId,
                    'stageName' => $rosterStageName,
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
     * Query base do roster com filtros de quadro/arquivados (sem ordenação da lista).
     *
     * @return Builder<Volunteer>
     */
    public static function boardFilteredVolunteerQuery(Request $request, int $churchId): Builder
    {
        $q = self::volunteersVisibleInChurchQuery($churchId);
        VolunteerLeadRosterFilters::apply($request, $q, $churchId);
        self::applyStaffArchivedFilter(
            $q,
            $churchId,
            VolunteerLeadRosterFilters::showsArchivedRoster($request),
        );

        return $q;
    }

    /**
     * Query base do roster com filtros/sort/arquivados aplicados (mesmo conjunto que o usuário vê na lista).
     *
     * @param  Request  $request
     * @return Builder<Volunteer>
     */
    private static function filteredRosterQuery(Request $request, int $churchId, ?User $user): Builder
    {
        $q = self::boardFilteredVolunteerQuery($request, $churchId)
            ->with([
                'user:id,email,photo_url',
                'ministries' => fn ($m) => $m->where('church_id', $churchId),
                'churchPipelines' => fn ($p) => $p->where('church_id', $churchId)->with(['stage', 'adminWorkflowStage']),
                'ministryInvitations' => fn ($i) => $i->where('church_id', $churchId)->with('ministry:id,name,church_id'),
            ]);

        VolunteerLeadRosterFilters::applySort(
            $request,
            $q,
            $churchId,
            (bool) $user?->can('volunteers.manage'),
        );

        return $q;
    }

    /**
     * Contagem por fase (stage_id) respeitando exatamente o mesmo conjunto filtrado que a lista.
     *
     * @return array<int,int> Map stage_id => count
     */
    private static function filteredStageCountsById(Request $request, int $churchId, ?User $user): array
    {
        // Se não há tabela de pipeline, não há contagens.
        if (! Schema::hasTable('volunteer_church_pipelines')) {
            return [];
        }

        // Clona o query “visível + filtros + arquivados” (mas sem paginação) e faz o join do pipeline da igreja.
        $q = self::filteredRosterQuery($request, $churchId, $user)
            ->getQuery()
            ->clone();

        // Remove colunas/orderings da query original; aqui só interessa groupBy.
        $q->orders = null;
        $q->columns = null;

        // Atenção: a filteredRosterQuery já restringe app_access_only=false no Volunteer.
        $adminWorkflowStageIds = VolunteerPipelineBootstrap::adminWorkflowStageIdsForChurch($churchId);
        $useAdminWorkflowCounts = $user !== null && $user->can('volunteers.manage')
            && Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id');

        $baseJoin = DB::query()
            ->fromSub($q, 'v')
            ->join('volunteer_church_pipelines as p', function ($join) use ($churchId) {
                $join->on('p.volunteer_id', '=', 'v.id')
                    ->where('p.church_id', '=', $churchId)
                    ->whereNull('p.staff_archived_at');
            });

        $out = [];

        if ($useAdminWorkflowCounts) {
            $adminRows = (clone $baseJoin)
                ->selectRaw('p.admin_workflow_stage_id as stage_id, COUNT(*) as c')
                ->whereNotNull('p.admin_workflow_stage_id')
                ->groupBy('p.admin_workflow_stage_id')
                ->get();

            foreach ($adminRows as $r) {
                $sid = (int) ($r->stage_id ?? 0);
                if ($sid <= 0) {
                    continue;
                }
                $out[$sid] = (int) ($r->c ?? 0);
            }

            if ($adminWorkflowStageIds !== []) {
                $legacyRows = (clone $baseJoin)
                    ->selectRaw('p.stage_id as stage_id, COUNT(*) as c')
                    ->whereNull('p.admin_workflow_stage_id')
                    ->whereIn('p.stage_id', $adminWorkflowStageIds)
                    ->whereNotNull('p.stage_id')
                    ->groupBy('p.stage_id')
                    ->get();

                foreach ($legacyRows as $r) {
                    $sid = (int) ($r->stage_id ?? 0);
                    if ($sid <= 0) {
                        continue;
                    }
                    $out[$sid] = ($out[$sid] ?? 0) + (int) ($r->c ?? 0);
                }
            }

            return $out;
        }

        $rows = (clone $baseJoin)
            ->selectRaw('p.stage_id as stage_id, COUNT(*) as c')
            ->whereNotNull('p.stage_id')
            ->when(
                $adminWorkflowStageIds !== [],
                fn ($query) => $query->whereNotIn('p.stage_id', $adminWorkflowStageIds),
            )
            ->groupBy('p.stage_id')
            ->get();

        foreach ($rows as $r) {
            $sid = (int) ($r->stage_id ?? 0);
            if ($sid <= 0) {
                continue;
            }
            $out[$sid] = (int) ($r->c ?? 0);
        }

        return $out;
    }

    /**
     * @return list<array{ministryName: string, inviteLabel: string, departmentStatusLabel: string}>
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
            $inviteLabel = $inv !== null
                ? VolunteerInvitationStatusLabels::forInvitation($inv)
                : '—';
            $departmentStatusLabel = VolunteerLeaderStatusLabels::label(
                ($inv?->leader_status !== null && $inv->leader_status !== '') ? $inv->leader_status : null,
            );

            $rows[] = [
                'ministryName' => $name,
                'inviteLabel' => $inviteLabel,
                'departmentStatusLabel' => $departmentStatusLabel,
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
