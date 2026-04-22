<?php

namespace App\Support;

use App\Models\Church;
use App\Models\Pastor;
use App\Models\PastoralAvailability;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PastoralBookingInertiaProps
{
    /**
     * Dados para o formulário «Agendar com pastor» (app), quando há utilizador e igreja em contexto.
     *
     * @return array{pastors: array<int, array{id: int, name: string, slots: array<int, array{value: string, label: string, modality: string}>}>, storeUrl: string, defaultRequesterName: string}|null
     */
    public static function forRequest(Request $request): ?array
    {
        return self::pastorPayload($request, null, null);
    }

    /**
     * @param  int|null  $ignoreConflictAppointmentId  Ignorar este pedido ao marcar horários como ocupados (edição do próprio pedido).
     * @param  int|null  $ignoreChurchSolicitationId  Ignorar esta solicitação «visita aos pastores» ao calcular ocupação (edição do próprio pedido).
     * @return array{pastors: array<int, array{id: int, name: string, slots: array<int, array{value: string, label: string, modality: string}>}>, storeUrl: string, defaultRequesterName: string}|null
     */
    public static function pastorPayload(Request $request, ?int $ignoreConflictAppointmentId = null, ?int $ignoreChurchSolicitationId = null): ?array
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        $churchId = Church::resolveWorkingId($request);
        if ($churchId === null) {
            return null;
        }

        $tz = (string) config('app.timezone');
        $from = Carbon::now($tz)->startOfMinute();

        $pastors = Pastor::query()
            ->where('church_id', $churchId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Pastor $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slots' => PastoralAvailability::upcomingSlotsForDisplay(
                    (int) $churchId,
                    (int) $p->id,
                    $from,
                    90,
                    48,
                    $ignoreConflictAppointmentId,
                    $ignoreChurchSolicitationId,
                ),
            ])
            ->values()
            ->all();

        return [
            'pastors' => $pastors,
            'storeUrl' => route('mobile.pastoral-appointments.store'),
            'defaultRequesterName' => (string) $user->name,
        ];
    }
}
