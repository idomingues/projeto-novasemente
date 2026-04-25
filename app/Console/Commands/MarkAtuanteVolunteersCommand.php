<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\Volunteer;
use App\Models\VolunteerPipelineStage;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[AsCommand(
    name: 'volunteers:mark-atuante',
    description: 'Cria a fase "Atuante" (se faltar) e move voluntários com tempo de voluntariado preenchido.'
)]
class MarkAtuanteVolunteersCommand extends Command
{
    protected $signature = 'volunteers:mark-atuante {--church= : ID da igreja (opcional)} {--dry-run : Só mostra quantos seriam alterados}';

    public function handle(): int
    {
        $churchId = $this->option('church') ? (int) $this->option('church') : null;
        $dry = (bool) $this->option('dry-run');

        $churchIds = $churchId
            ? [(int) $churchId]
            : Church::query()->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        if ($churchIds === []) {
            $this->warn('Nenhuma igreja encontrada.');

            return self::SUCCESS;
        }

        $total = 0;
        foreach ($churchIds as $cid) {
            $stage = $this->ensureAtuanteStage($cid);
            $stageId = (int) $stage->id;

            // Critério baseado no Excel:
            // - Planilha "recadastro" (atuantes) não tem data de nascimento e não pergunta redes sociais:
            //   -> birth_date NULL e has_social_networks NULL
            // - Planilha "novos" tem ambos preenchidos:
            //   -> birth_date NOT NULL e has_social_networks NOT NULL (true/false)
            //
            // Portanto: Atuante = assinatura recadastro (birth_date IS NULL && has_social_networks IS NULL).
            $atuanteVolunteerIds = DB::table('volunteers')
                ->whereNull('birth_date')
                ->whereNull('has_social_networks')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            $novosVolunteerIds = DB::table('volunteers')
                ->whereNotNull('birth_date')
                ->whereNotNull('has_social_networks')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            // Garante pipeline para todos os envolvidos.
            if (! $dry) {
                foreach (array_values(array_unique(array_merge($atuanteVolunteerIds, $novosVolunteerIds))) as $vid) {
                    $v = Volunteer::query()->find($vid);
                    if ($v) {
                        VolunteerPipelineBootstrap::ensureRowForVolunteerInChurch($v, $cid);
                    }
                }
            }

            $defaultStageId = VolunteerPipelineBootstrap::defaultStageIdForNewVolunteer($cid);

            $toAtuante = DB::table('volunteer_church_pipelines')
                ->where('church_id', $cid)
                ->whereIn('volunteer_id', $atuanteVolunteerIds)
                ->where('stage_id', '!=', $stageId);
            $countAtu = (int) $toAtuante->count();

            $countBack = 0;
            if ($defaultStageId) {
                $toDefault = DB::table('volunteer_church_pipelines')
                    ->where('church_id', $cid)
                    ->whereIn('volunteer_id', $novosVolunteerIds)
                    ->where('stage_id', $stageId);
                $countBack = (int) $toDefault->count();
            }

            $this->info("Igreja {$cid}: {$countAtu} vão para Atuante; {$countBack} voltam para a fase padrão.");

            if (! $dry) {
                if ($countAtu > 0) {
                    $updatedAtu = (int) $toAtuante->update([
                        'stage_id' => $stageId,
                        'updated_at' => now(),
                    ]);
                    $this->line("Igreja {$cid}: atualizados para Atuante: {$updatedAtu}.");
                }
                if ($defaultStageId && $countBack > 0) {
                    $updatedBack = (int) DB::table('volunteer_church_pipelines')
                        ->where('church_id', $cid)
                        ->whereIn('volunteer_id', $novosVolunteerIds)
                        ->where('stage_id', $stageId)
                        ->update([
                            'stage_id' => (int) $defaultStageId,
                            'updated_at' => now(),
                        ]);
                    $this->line("Igreja {$cid}: atualizados para padrão: {$updatedBack}.");
                }
            }

            $total += ($countAtu + $countBack);
        }

        $this->info($dry ? "Dry-run concluído. Total a alterar: {$total}." : "Concluído. Total alterado: {$total}.");

        return self::SUCCESS;
    }

    private function ensureAtuanteStage(int $churchId): VolunteerPipelineStage
    {
        $existing = VolunteerPipelineStage::query()
            ->where('church_id', $churchId)
            ->whereRaw('LOWER(name) = ?', ['atuante'])
            ->first();

        if ($existing) {
            return $existing;
        }

        $max = (int) VolunteerPipelineStage::query()->where('church_id', $churchId)->max('sort_order');
        $nextSort = $max > 0 ? $max + 10 : 50;

        return VolunteerPipelineStage::create([
            'church_id' => $churchId,
            'name' => 'Atuante',
            'sort_order' => $nextSort,
        ]);
    }
}

