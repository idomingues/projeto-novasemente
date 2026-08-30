<?php

namespace App\Console\Commands;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Uso pontual em produção: limpa o backlog atual de pedidos de voluntário pendentes.
 *
 * Preview (não altera nada):
 *   php artisan volunteer-requests:clear-pending
 *
 * Execução:
 *   php artisan volunteer-requests:clear-pending --force
 */
#[AsCommand(
    name: 'volunteer-requests:clear-pending',
    description: 'Exclui pedidos de voluntário pendentes atuais (pending e in_progress). Uso pontual em produção.',
)]
class ClearPendingVolunteerRequestsCommand extends Command
{
    /** @var list<string> */
    private const PENDING_STATUSES = ['pending', 'in_progress'];

    protected $signature = 'volunteer-requests:clear-pending
                            {--force : Exclui de fato (sem isto, só mostra o que seria removido)}
                            {--church= : Slug ou ID da igreja (padrão: todas)}';

    public function handle(): int
    {
        $church = $this->resolveChurch();
        if ($church === false) {
            return self::FAILURE;
        }

        $query = ChurchSolicitation::query()
            ->where('type', MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST)
            ->whereIn('status', self::PENDING_STATUSES)
            ->orderBy('id');

        if ($church instanceof Church) {
            $query->where('church_id', $church->id);
        }

        $rows = $query->get(['id', 'church_id', 'status', 'subject']);
        $count = $rows->count();

        if ($count === 0) {
            $this->info('Nenhum pedido de voluntário pendente encontrado.');

            return self::SUCCESS;
        }

        $ids = $rows->pluck('id')->map(fn ($id) => (int) $id)->all();
        $messageCount = 0;
        if (Schema::hasTable('church_solicitation_messages')) {
            $messageCount = (int) ChurchSolicitationMessage::query()
                ->whereIn('church_solicitation_id', $ids)
                ->count();
        }

        $this->warn("Encontrados {$count} pedido(s) de voluntário pendente(s).");
        $this->summarizeByChurch($rows);
        if ($messageCount > 0) {
            $this->line("Mensagens de chat associadas: {$messageCount}.");
        }

        $idPreview = $ids;
        if (count($idPreview) > 40) {
            $idPreview = array_merge(array_slice($idPreview, 0, 40), ['…']);
        }
        $this->line('IDs: '.implode(', ', $idPreview).'.');

        if (! $this->option('force')) {
            $this->info('Nada foi alterado. Execute com --force para excluir.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($ids, $count, $messageCount): void {
            if (Schema::hasTable('church_solicitation_messages')) {
                ChurchSolicitationMessage::query()
                    ->whereIn('church_solicitation_id', $ids)
                    ->delete();
            }

            ChurchSolicitation::query()->whereIn('id', $ids)->delete();

            $this->info("Excluídos {$count} pedido(s)".($messageCount > 0 ? " e {$messageCount} mensagem(ns)" : '').'.');
        });

        return self::SUCCESS;
    }

    /**
     * @return Church|null|false Church filtrada, null = todas, false = igreja inválida
     */
    private function resolveChurch(): Church|null|false
    {
        $churchOpt = trim((string) $this->option('church'));
        if ($churchOpt === '') {
            return null;
        }

        $church = ctype_digit($churchOpt)
            ? Church::query()->find((int) $churchOpt)
            : Church::query()->where('slug', $churchOpt)->first();

        if ($church === null) {
            $this->error("Igreja não encontrada: {$churchOpt}");

            return false;
        }

        return $church;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, ChurchSolicitation>  $rows
     */
    private function summarizeByChurch($rows): void
    {
        $churchNames = Church::query()
            ->whereIn('id', $rows->pluck('church_id')->unique()->filter()->all())
            ->pluck('name', 'id');

        $grouped = $rows->groupBy('church_id');
        foreach ($grouped as $churchId => $churchRows) {
            $name = $churchNames->get($churchId, 'Igreja');
            $byStatus = $churchRows->groupBy('status')->map->count();
            $parts = [];
            foreach (self::PENDING_STATUSES as $status) {
                $n = (int) ($byStatus[$status] ?? 0);
                if ($n > 0) {
                    $parts[] = "{$status}: {$n}";
                }
            }
            $this->line(sprintf(
                '  · %s (#%s): %d (%s)',
                $name,
                $churchId === null || $churchId === '' ? '?' : (string) $churchId,
                $churchRows->count(),
                implode(', ', $parts),
            ));
        }
    }
}
