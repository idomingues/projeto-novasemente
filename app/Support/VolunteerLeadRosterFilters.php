<?php

namespace App\Support;

use App\Models\Volunteer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class VolunteerLeadRosterFilters
{
    /** Filtro especial na barra «Fases» (não é registro em volunteer_pipeline_stages). */
    public const PIPELINE_STAGE_ARCHIVED = 'arquivados';

    public const PIPELINE_STAGE_ADMIN_WORKFLOW_BLANK = 'sem-fase-principal';

    public const SORT_NAME = 'name';

    public const SORT_CREATED_AT = 'created_at';

    /** Fase principal (admin); em líder de ministério usa a fase do quadro. */
    public const SORT_WORKFLOW_STAGE = 'workflow_stage';

    public const SORT_PIPELINE_STAGE = 'stage';

    public const DEFAULT_SORT = self::SORT_NAME;

    public const DEFAULT_SORT_DIR = 'asc';

    public static function showsArchivedRoster(Request $request): bool
    {
        if ($request->input('pipeline_stage_id') === self::PIPELINE_STAGE_ARCHIVED) {
            return true;
        }

        return $request->query('arquivados') === '1';
    }

    public static function normalizedPipelineStageId(Request $request): string
    {
        if (self::showsArchivedRoster($request)) {
            return self::PIPELINE_STAGE_ARCHIVED;
        }

        $sid = trim((string) $request->input('pipeline_stage_id', ''));
        if ($sid === self::PIPELINE_STAGE_ADMIN_WORKFLOW_BLANK) {
            return self::PIPELINE_STAGE_ADMIN_WORKFLOW_BLANK;
        }

        return $sid;
    }

    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function apply(Request $request, Builder $q, int $churchId): void
    {
        $search = trim((string) $request->input('search', ''));
        if ($search !== '') {
            SearchTerm::whereAnyColumnLike($q, ['name', 'email', 'phone'], $search);
        }

        $hasUserAccount = $request->input('has_user_account');
        if ($hasUserAccount === '0' || $hasUserAccount === '1' || $hasUserAccount === 0 || $hasUserAccount === 1) {
            if ((bool) (int) $hasUserAccount) {
                $q->whereNotNull('user_id');
            } else {
                $q->whereNull('user_id');
            }
        }

        foreach ([
            'has_whatsapp',
            'has_social_networks',
            'is_official_member',
            'member_record_at_nova_semente',
            'has_previous_ministry_volunteer_experience',
            'needs_pastoral_guidance',
            'lgpd_data_consent',
            'active',
            'app_access_only',
        ] as $boolField) {
            $v = $request->input($boolField);
            if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
                $q->where($boolField, (bool) (int) $v);
            }
        }

        $role = trim((string) $request->input('role', ''));
        if ($role !== '' && mb_strlen($role) >= 2) {
            $q->where('role', 'like', '%'.$role.'%');
        }

        foreach ([
            'has_email' => 'email',
            'has_phone' => 'phone',
            'has_birth_date' => 'birth_date',
        ] as $flag => $col) {
            $v = $request->input($flag);
            if ($v === '0' || $v === '1' || $v === 0 || $v === 1) {
                $yes = (bool) (int) $v;
                if ($yes) {
                    $q->whereNotNull($col);
                    if ($col !== 'birth_date') {
                        $q->whereRaw('TRIM(COALESCE('.$col.", '')) <> ''");
                    }
                } else {
                    $q->where(function ($sub) use ($col) {
                        $sub->whereNull($col);
                        if ($col !== 'birth_date') {
                            $sub->orWhereRaw('TRIM(COALESCE('.$col.", '')) = ''");
                        }
                    });
                }
            }
        }

        $att = trim((string) $request->input('attendance_duration', ''));
        if ($att !== '') {
            // Se o valor for um dos slugs do cadastro, filtra por igualdade (melhor UX em select).
            // Caso contrário, permite busca livre (compatibilidade com dados antigos).
            $known = [
                'less_than_3_months',
                'months_3_6',
                'months_6_12',
                'years_1_3',
                'more_than_3_years',
            ];
            if (in_array($att, $known, true)) {
                $q->where('attendance_duration', $att);
            } else {
                $q->where('attendance_duration', 'like', '%'.$att.'%');
            }
        }

        $attText = trim((string) $request->input('attendance_duration_text', ''));
        if ($attText !== '' && mb_strlen($attText) >= 2) {
            $q->where('attendance_duration', 'like', '%'.$attText.'%');
        }

        $cf = trim((string) $request->input('created_from', ''));
        if ($cf !== '' && strtotime($cf) !== false) {
            $q->whereDate('volunteers.created_at', '>=', $cf);
        }
        $ct = trim((string) $request->input('created_to', ''));
        if ($ct !== '' && strtotime($ct) !== false) {
            $q->whereDate('volunteers.created_at', '<=', $ct);
        }

        $bf = trim((string) $request->input('birth_date_from', ''));
        if ($bf !== '' && strtotime($bf) !== false) {
            $q->whereDate('volunteers.birth_date', '>=', $bf);
        }
        $bt = trim((string) $request->input('birth_date_to', ''));
        if ($bt !== '' && strtotime($bt) !== false) {
            $q->whereDate('volunteers.birth_date', '<=', $bt);
        }

        $rc = trim((string) $request->input('member_record_church', ''));
        if ($rc !== '' && mb_strlen($rc) >= 2) {
            $q->where('member_record_church', 'like', '%'.$rc.'%');
        }

        $pa = trim((string) $request->input('professional_area', ''));
        if ($pa !== '' && mb_strlen($pa) >= 2) {
            $q->where('professional_area', 'like', '%'.$pa.'%');
        }

        $ministryIdsRaw = $request->input('ministry_ids', []);
        $ministryIds = [];
        if (is_string($ministryIdsRaw)) {
            $ministryIds = array_values(array_filter(array_map(
                fn ($x) => is_numeric($x) ? (int) $x : null,
                preg_split('/[,\s]+/', $ministryIdsRaw) ?: []
            )));
        } elseif (is_array($ministryIdsRaw)) {
            $ministryIds = array_values(array_filter(array_map(fn ($x) => is_numeric($x) ? (int) $x : null, $ministryIdsRaw)));
        }
        $ministryIds = array_values(array_unique(array_filter($ministryIds, fn ($x) => $x > 0)));
        if ($ministryIds !== []) {
            $centerMode = $request->query('center_mode') === '1' || $request->input('center_mode') === '1';
            if ($centerMode && Schema::hasTable('volunteer_ministry_invitations')) {
                $q->where(function ($outer) use ($ministryIds, $churchId) {
                    $outer->whereHas('ministries', fn ($mq) => $mq
                        ->whereIn('ministries.id', $ministryIds)
                        ->where('church_id', $churchId))
                        ->orWhereHas('ministryInvitations', fn ($iq) => $iq
                            ->where('church_id', $churchId)
                            ->whereIn('ministry_id', $ministryIds));
                });
            } else {
                $q->whereHas('ministries', fn ($mq) => $mq->whereIn('ministries.id', $ministryIds)->where('church_id', $churchId));
            }
        }

        $ti = trim((string) $request->input('text_interest', ''));
        if ($ti !== '' && mb_strlen($ti) >= 2) {
            $like = '%'.$ti.'%';
            $q->where(function ($sub) use ($like) {
                $sub->where('ministry_involvement', 'like', $like)
                    ->orWhere('other_ministry_interest', 'like', $like)
                    ->orWhere('gifts_to_develop', 'like', $like)
                    ->orWhere('previous_ministry_details', 'like', $like);
            });
        }

        if ($request->query('center_sem_departamento') === '1') {
            $q->whereDoesntHave('ministries', fn ($mq) => $mq->where('church_id', $churchId));
            if (Schema::hasTable('volunteer_ministry_invitations')) {
                $q->whereDoesntHave('ministryInvitations', fn ($iq) => $iq->where('church_id', $churchId));
            }
        }

        $centerPhaseKey = trim((string) $request->input('center_phase_key', ''));
        if ($centerPhaseKey !== '') {
            VolunteerManagementCenterBuilder::applyCenterPhaseFilter($q, $churchId, $centerPhaseKey);
        }

        $sid = $request->input('pipeline_stage_id');
        if ($sid === self::PIPELINE_STAGE_ADMIN_WORKFLOW_BLANK) {
            $allowed = VolunteerPipelineBootstrap::adminWorkflowStageIdsForChurch($churchId);
            if ($allowed === []) {
                $allowed = [-1];
            }

            $q->whereHas('churchPipelines', function ($p) use ($churchId, $allowed) {
                $p->where('church_id', $churchId)
                    ->whereNull('admin_workflow_stage_id')
                    ->where(function ($sub) use ($allowed) {
                        $sub->whereNull('stage_id')->orWhereNotIn('stage_id', $allowed);
                    });
            });

            return;
        }
        if ($sid !== null && $sid !== '' && $sid !== self::PIPELINE_STAGE_ARCHIVED && is_numeric($sid)) {
            $q->whereHas('churchPipelines', fn ($p) => $p->where('church_id', $churchId)->where('stage_id', (int) $sid));
        }
    }

    public static function normalizedSort(Request $request): string
    {
        $sort = trim((string) $request->input('sort', self::DEFAULT_SORT));

        return in_array($sort, [self::SORT_NAME, self::SORT_CREATED_AT, self::SORT_WORKFLOW_STAGE, self::SORT_PIPELINE_STAGE], true)
            ? $sort
            : self::DEFAULT_SORT;
    }

    public static function normalizedSortDir(Request $request): string
    {
        $dir = strtolower(trim((string) $request->input('sort_dir', self::DEFAULT_SORT_DIR)));

        return $dir === 'desc' ? 'desc' : 'asc';
    }

    /**
     * @param  Builder<Volunteer>  $q
     */
    public static function applySort(Request $request, Builder $q, int $churchId, bool $useAdminWorkflowStageSort): void
    {
        $sort = self::normalizedSort($request);
        $dir = self::normalizedSortDir($request);

        if ($sort === self::SORT_CREATED_AT) {
            $q->orderBy('volunteers.created_at', $dir)->orderBy('volunteers.name');

            return;
        }

        if ($sort === self::SORT_WORKFLOW_STAGE || $sort === self::SORT_PIPELINE_STAGE) {
            self::applyStageSort($q, $churchId, $useAdminWorkflowStageSort && $sort === self::SORT_WORKFLOW_STAGE, $dir);

            return;
        }

        $q->orderBy('volunteers.name', $dir)->orderBy('volunteers.id', $dir);
    }

    /**
     * @param  Builder<Volunteer>  $q
     */
    private static function applyStageSort(Builder $q, int $churchId, bool $adminWorkflow, string $dir): void
    {
        $q->leftJoin('volunteer_church_pipelines as roster_pipe', function ($join) use ($churchId) {
            $join->on('volunteers.id', '=', 'roster_pipe.volunteer_id')
                ->where('roster_pipe.church_id', '=', $churchId);
        });

        if ($adminWorkflow && Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
            $q->leftJoin('volunteer_pipeline_stages as roster_stage_admin', 'roster_pipe.admin_workflow_stage_id', '=', 'roster_stage_admin.id')
                ->leftJoin('volunteer_pipeline_stages as roster_stage_pipe', 'roster_pipe.stage_id', '=', 'roster_stage_pipe.id');
            $sortOrderExpr = 'COALESCE(roster_stage_admin.sort_order, roster_stage_pipe.sort_order, 999999)';
            $nameExpr = "COALESCE(NULLIF(TRIM(roster_stage_admin.name), ''), NULLIF(TRIM(roster_stage_pipe.name), ''), 'zzz')";
        } else {
            $q->leftJoin('volunteer_pipeline_stages as roster_stage_pipe', 'roster_pipe.stage_id', '=', 'roster_stage_pipe.id');
            $sortOrderExpr = 'COALESCE(roster_stage_pipe.sort_order, 999999)';
            $nameExpr = "COALESCE(NULLIF(TRIM(roster_stage_pipe.name), ''), 'zzz')";
        }

        $q->select('volunteers.*')
            ->orderByRaw("{$sortOrderExpr} {$dir}")
            ->orderByRaw("{$nameExpr} {$dir}")
            ->orderBy('volunteers.name');
    }

    /**
     * @return array<string, string>
     */
    public static function filterState(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'has_user_account' => (string) $request->input('has_user_account', ''),
            'has_whatsapp' => (string) $request->input('has_whatsapp', ''),
            'has_social_networks' => (string) $request->input('has_social_networks', ''),
            'is_official_member' => (string) $request->input('is_official_member', ''),
            'member_record_at_nova_semente' => (string) $request->input('member_record_at_nova_semente', ''),
            'has_previous_ministry_volunteer_experience' => (string) $request->input('has_previous_ministry_volunteer_experience', ''),
            'needs_pastoral_guidance' => (string) $request->input('needs_pastoral_guidance', ''),
            'lgpd_data_consent' => (string) $request->input('lgpd_data_consent', ''),
            'active' => (string) $request->input('active', ''),
            'app_access_only' => (string) $request->input('app_access_only', ''),
            'role' => trim((string) $request->input('role', '')),
            'has_email' => (string) $request->input('has_email', ''),
            'has_phone' => (string) $request->input('has_phone', ''),
            'has_birth_date' => (string) $request->input('has_birth_date', ''),
            'attendance_duration' => trim((string) $request->input('attendance_duration', '')),
            'attendance_duration_text' => trim((string) $request->input('attendance_duration_text', '')),
            'created_from' => trim((string) $request->input('created_from', '')),
            'created_to' => trim((string) $request->input('created_to', '')),
            'birth_date_from' => trim((string) $request->input('birth_date_from', '')),
            'birth_date_to' => trim((string) $request->input('birth_date_to', '')),
            'member_record_church' => trim((string) $request->input('member_record_church', '')),
            'professional_area' => trim((string) $request->input('professional_area', '')),
            'ministry_ids' => (string) $request->input('ministry_ids', ''),
            'text_interest' => trim((string) $request->input('text_interest', '')),
            'pipeline_stage_id' => self::normalizedPipelineStageId($request),
            'arquivados' => self::showsArchivedRoster($request),
            'sort' => self::normalizedSort($request),
            'sort_dir' => self::normalizedSortDir($request),
        ];
    }
}
