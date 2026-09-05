<?php

namespace App\Actions\Volunteers;

use App\Models\Ministry;
use App\Models\User;
use App\Models\Volunteer;
use App\Models\VolunteerLeaderNote;
use App\Support\VolunteerPipelineBootstrap;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pedido de novo departamento por voluntário já cadastrado:
 * anotação na ficha + status Interessado (sem convite — a distribuição é do líder).
 */
final class RequestVolunteerNewDepartment
{
    /**
     * @param  list<int>  $ministryIds
     */
    public function __invoke(
        Volunteer $volunteer,
        int $churchId,
        array $ministryIds,
        string $reason,
        ?User $actor = null,
    ): void {
        $normalized = array_values(array_unique(array_filter(
            array_map('intval', $ministryIds),
            fn (int $id) => $id > 0
        )));

        if ($normalized === []) {
            throw ValidationException::withMessages([
                'ministry_ids' => ['Selecione ao menos um departamento.'],
            ]);
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['Informe o motivo do pedido.'],
            ]);
        }

        $ministries = Ministry::query()
            ->where('church_id', $churchId)
            ->whereIn('id', $normalized)
            ->orderBy('name')
            ->get(['id', 'name']);

        if ($ministries->count() !== count($normalized)) {
            throw ValidationException::withMessages([
                'ministry_ids' => ['Selecione apenas departamentos válidos desta igreja.'],
            ]);
        }

        $attachedIds = $volunteer->ministries()
            ->where('church_id', $churchId)
            ->pluck('ministries.id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $alreadyAttached = $ministries->filter(
            fn (Ministry $m) => in_array((int) $m->id, $attachedIds, true)
        );

        if ($alreadyAttached->isNotEmpty()) {
            throw ValidationException::withMessages([
                'ministry_ids' => [
                    'Você já faz parte de: '.$alreadyAttached->pluck('name')->join(', ').'. Escolha outro departamento.',
                ],
            ]);
        }

        $names = $ministries->pluck('name')->join(', ');
        $actorLabel = $actor?->name ? trim((string) $actor->name) : 'Voluntário';
        $noteBody = "Pedido de novo departamento (pelo próprio voluntário).\n"
            ."Solicitante: {$actorLabel}\n"
            ."Departamento(s): {$names}\n"
            ."Motivo: {$reason}";

        DB::transaction(function () use ($volunteer, $churchId, $actor, $noteBody) {
            VolunteerLeaderNote::query()->create([
                'volunteer_id' => (int) $volunteer->id,
                'church_id' => $churchId,
                'user_id' => $actor?->id,
                'body' => $noteBody,
            ]);

            VolunteerPipelineBootstrap::setInteressadoStageForVolunteer(
                $volunteer->fresh() ?? $volunteer,
                $churchId,
            );
        });
    }
}
