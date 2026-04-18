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
        ['name' => 'Em treinamento', 'sort_order' => 20],
        ['name' => 'Pronto para servir', 'sort_order' => 30],
        ['name' => 'A servir', 'sort_order' => 40],
    ];

    /**
     * Garante as quatro fases padrão quando a igreja ainda não tem nenhuma (ex.: igreja nova).
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
}
