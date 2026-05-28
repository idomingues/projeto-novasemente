<?php

namespace App\Support;

use App\Models\Volunteer;
use App\Models\VolunteerChurchPipeline;
use App\Models\VolunteerPipelineStage;
use Illuminate\Support\Facades\Schema;

class VolunteerPipelineBootstrap
{
    /** Fases iniciais alinhadas com a migration `create_volunteer_pipeline_tables`. */
    private const DEFAULT_STAGES = [
        ['name' => 'Interessado', 'sort_order' => 10],
        ['name' => 'Encaminhado', 'sort_order' => 15],
        ['name' => 'Em treinamento', 'sort_order' => 20],
        ['name' => 'Pronto para servir', 'sort_order' => 30],
        ['name' => 'A servir', 'sort_order' => 40],
        ['name' => 'Finalizado', 'sort_order' => 50],
    ];

    public const STAGE_RECUSADO_VOLUNTARIO = 'recusado pelo voluntário';

    public const STAGE_RECUSADO_LIDER = 'recusado pelo líder';

    /** Status geral do adm (seletor na ficha) — apenas macro-fases; recusas e «Em análise» são por departamento. */
    public const ADMIN_WORKFLOW_STAGE_NAMES = [
        'interessado',
        'encaminhado',
        'atuante',
        'finalizado',
    ];

    /**
     * @return list<int>
     */
    public static function adminWorkflowStageIdsForChurch(int $churchId): array
    {
        return collect(self::adminWorkflowStagesForChurch($churchId))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Garante as fases padrão quando a igreja ainda não tem nenhuma (ex.: igreja nova).
     */
    public static function seedDefaultStagesForChurch(int $churchId): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        $exists = VolunteerPipelineStage::query()->where('church_id', $churchId)->exists();
        if ($exists) {
            return;
        }

        foreach (self::DEFAULT_STAGES as $row) {
            VolunteerPipelineStage::query()->create([
                'church_id' => $churchId,
                'name' => $row['name'],
                'sort_order' => $row['sort_order'],
            ]);
        }
    }

    /**
     * ID da fase «Interessado» para novos voluntários nesta igreja.
     * Cria a fase se a igreja tiver etapas mas nenhuma com esse nome.
     */
    public static function defaultStageIdForNewVolunteer(int $churchId): ?int
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return null;
        }

        self::seedDefaultStagesForChurch($churchId);

        $id = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['interessado'])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->value('id');

        if ($id !== null) {
            return (int) $id;
        }

        $minSort = VolunteerPipelineStage::query()->where('church_id', $churchId)->min('sort_order');
        $minSort = $minSort !== null ? (int) $minSort : 20;
        $sortOrder = min(10, max(0, $minSort - 1));

        $created = VolunteerPipelineStage::query()->create([
            'church_id' => $churchId,
            'name' => 'Interessado',
            'sort_order' => $sortOrder,
        ]);

        return (int) $created->id;
    }

    public static function ensureRowForVolunteerInChurch(Volunteer $volunteer, int $churchId): void
    {
        $stageId = self::defaultStageIdForNewVolunteer($churchId);

        if (! $stageId) {
            return;
        }

        $create = ['stage_id' => (int) $stageId];
        if (Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')) {
            $create['admin_workflow_stage_id'] = (int) $stageId;
        }

        VolunteerChurchPipeline::query()->firstOrCreate(
            [
                'volunteer_id' => $volunteer->id,
                'church_id' => $churchId,
            ],
            $create,
        );
    }

    /**
     * Novo cadastro público / adm: status geral deve começar em «Interessado».
     */
    public static function setInteressadoStageForVolunteer(Volunteer $volunteer, int $churchId): void
    {
        self::moveVolunteerToStageByNormalizedName($volunteer, $churchId, 'interessado');
    }

    /**
     * ID da fase principal (adm): só retorna valor se estiver entre as macro-fases permitidas.
     */
    public static function resolveAdminWorkflowStageId(int $churchId, ?int $adminWorkflowStageId): ?int
    {
        if ($adminWorkflowStageId === null) {
            return null;
        }

        $allowedIds = collect(self::adminWorkflowStagesForChurch($churchId))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if (in_array((int) $adminWorkflowStageId, $allowedIds, true)) {
            return (int) $adminWorkflowStageId;
        }

        return null;
    }

    /**
     * Fase principal para exibição: valor explícito (admin_workflow_stage_id) ou stage_id
     * quando corresponder a uma macro-fase permitida.
     */
    public static function effectiveAdminWorkflowStageId(int $churchId, ?int $adminWorkflowStageId, ?int $pipelineStageId): ?int
    {
        $explicit = self::resolveAdminWorkflowStageId($churchId, $adminWorkflowStageId);
        if ($explicit !== null) {
            return $explicit;
        }

        if ($pipelineStageId === null) {
            return null;
        }

        $allowedIds = self::adminWorkflowStageIdsForChurch($churchId);

        return in_array((int) $pipelineStageId, $allowedIds, true) ? (int) $pipelineStageId : null;
    }

    /**
     * Move o voluntário para uma fase existente (nome comparado em minúsculas), ex.: «em treinamento».
     * Ignora se não existir tabela ou fase com esse nome.
     */
    public static function moveVolunteerToStageByNormalizedName(Volunteer $volunteer, int $churchId, string $normalizedName): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages') || ! Schema::hasTable('volunteer_church_pipelines')) {
            return;
        }

        self::seedDefaultStagesForChurch($churchId);
        self::ensureRecusaStagesForChurch($churchId);

        $needle = mb_strtolower(trim($normalizedName));
        if ($needle === '') {
            return;
        }

        $stageId = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', [$needle])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->value('id');

        if ($stageId === null) {
            return;
        }

        self::ensureRowForVolunteerInChurch($volunteer, $churchId);

        $update = ['stage_id' => (int) $stageId];
        if (
            Schema::hasColumn('volunteer_church_pipelines', 'admin_workflow_stage_id')
            && in_array($needle, self::ADMIN_WORKFLOW_STAGE_NAMES, true)
        ) {
            $update['admin_workflow_stage_id'] = (int) $stageId;
        }

        VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->update($update);
    }

    /**
     * Garante fases de recusa (voluntário vs líder) para filtro no quadro e movimentação automática.
     */
    public static function ensureRecusaStagesForChurch(int $churchId): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        foreach ([
            ['name' => 'Recusado pelo voluntário', 'needle' => self::STAGE_RECUSADO_VOLUNTARIO, 'sort_order' => 16],
            ['name' => 'Recusado pelo líder', 'needle' => self::STAGE_RECUSADO_LIDER, 'sort_order' => 17],
        ] as $row) {
            $exists = VolunteerPipelineStage::query()
                ->where('church_id', $churchId)
                ->whereRaw('LOWER(TRIM(name)) = ?', [$row['needle']])
                ->exists();

            if ($exists) {
                continue;
            }

            VolunteerPipelineStage::query()->create([
                'church_id' => $churchId,
                'name' => $row['name'],
                'sort_order' => $row['sort_order'],
            ]);
        }
    }

    /**
     * Garante a fase «Atuante» para o status geral do adm.
     */
    public static function ensureAtuanteStageForChurch(int $churchId): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        $exists = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['atuante'])
            ->exists();

        if ($exists) {
            return;
        }

        $encaminhadoSort = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['encaminhado'])
            ->orderBy('sort_order')
            ->value('sort_order');

        $finalizadoSort = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['finalizado'])
            ->orderBy('sort_order')
            ->value('sort_order');

        if ($encaminhadoSort !== null && $finalizadoSort !== null) {
            $sortOrder = (int) floor(((int) $encaminhadoSort + (int) $finalizadoSort) / 2);
            if ($sortOrder <= (int) $encaminhadoSort) {
                $sortOrder = (int) $encaminhadoSort + 1;
            }
            if ($sortOrder >= (int) $finalizadoSort) {
                $sortOrder = (int) $finalizadoSort - 1;
            }
        } elseif ($finalizadoSort !== null) {
            $sortOrder = max(0, (int) $finalizadoSort - 1);
        } elseif ($encaminhadoSort !== null) {
            $sortOrder = (int) $encaminhadoSort + 2;
        } else {
            $maxSort = (int) VolunteerPipelineStage::query()->where('church_id', $churchId)->max('sort_order');
            $sortOrder = $maxSort > 0 ? $maxSort + 10 : 45;
        }

        VolunteerPipelineStage::query()->create([
            'church_id' => $churchId,
            'name' => 'Atuante',
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * Garante a fase «Finalizado» para o status geral do adm.
     */
    public static function ensureFinalizadoStageForChurch(int $churchId): void
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return;
        }

        $exists = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(TRIM(name)) = ?', ['finalizado'])
            ->exists();

        if ($exists) {
            return;
        }

        $maxSort = (int) VolunteerPipelineStage::query()->where('church_id', $churchId)->max('sort_order');

        VolunteerPipelineStage::query()->create([
            'church_id' => $churchId,
            'name' => 'Finalizado',
            'sort_order' => $maxSort + 10,
        ]);
    }

    /**
     * Fases disponíveis no seletor de status geral (adm).
     *
     * @return list<array{id: int, name: string, sort_order: int}>
     */
    public static function adminWorkflowStagesForChurch(int $churchId): array
    {
        if (! Schema::hasTable('volunteer_pipeline_stages')) {
            return [];
        }

        self::seedDefaultStagesForChurch($churchId);
        self::ensureFinalizadoStageForChurch($churchId);
        self::ensureAtuanteStageForChurch($churchId);
        self::ensureRecusaStagesForChurch($churchId);

        $allowed = self::ADMIN_WORKFLOW_STAGE_NAMES;

        return VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'name', 'sort_order'])
            ->filter(fn (VolunteerPipelineStage $s) => in_array(mb_strtolower(trim($s->name)), $allowed, true))
            ->map(fn (VolunteerPipelineStage $s) => [
                'id' => (int) $s->id,
                'name' => $s->name,
                'sort_order' => (int) $s->sort_order,
            ])
            ->values()
            ->all();
    }
}
