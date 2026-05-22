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

    /** Status geral do adm (seletor na ficha) — apenas macro-fases; recusas são por departamento. */
    public const ADMIN_WORKFLOW_STAGE_NAMES = [
        'interessado',
        'encaminhado',
        'finalizado',
    ];

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

        VolunteerChurchPipeline::query()->firstOrCreate(
            [
                'volunteer_id' => $volunteer->id,
                'church_id' => $churchId,
            ],
            [
                'stage_id' => (int) $stageId,
            ],
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
     * ID de fase para o seletor de status geral (adm): se a fase atual não for Interessado/Encaminhado/Finalizado,
     * mostra Interessado (evita select HTML apontar para opção errada).
     */
    public static function resolveAdminWorkflowStageId(int $churchId, ?int $currentStageId): ?int
    {
        $allowedIds = collect(self::adminWorkflowStagesForChurch($churchId))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($currentStageId !== null && in_array((int) $currentStageId, $allowedIds, true)) {
            return (int) $currentStageId;
        }

        return self::defaultStageIdForNewVolunteer($churchId);
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

        VolunteerChurchPipeline::query()
            ->where('volunteer_id', $volunteer->id)
            ->where('church_id', $churchId)
            ->update(['stage_id' => (int) $stageId]);
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
