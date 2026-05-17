<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;
use Throwable;

class PastoralAvailability extends Model
{
    protected $fillable = [
        'church_id',
        'pastor_id',
        'date',
        'start',
        'end',
        'modality',
        'note',
        'bookable_by_members',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'bookable_by_members' => 'boolean',
        ];
    }

    public function pastor(): BelongsTo
    {
        return $this->belongsTo(Pastor::class);
    }

    /**
     * Disponibilidades futuras (data/hora no fuso da app) para um pastor.
     *
     * @return Collection<int, PastoralAvailability>
     */
    public static function upcomingCollection(int $churchId, int $pastorId, CarbonInterface $from, int $daysAhead = 90): Collection
    {
        $tz = (string) config('app.timezone');
        $cursor = $from instanceof Carbon
            ? $from->copy()->timezone($tz)->startOfMinute()
            : Carbon::parse($from->toDateTimeString(), $tz)->startOfMinute();
        $startDate = $cursor->toDateString();
        $endDate = $cursor->copy()->addDays(max(1, $daysAhead))->toDateString();

        return static::query()
            ->where('church_id', $churchId)
            ->where('pastor_id', $pastorId)
            ->where('bookable_by_members', true)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->orderBy('start')
            ->get()
            ->filter(function (PastoralAvailability $a) use ($cursor, $tz) {
                $slotStart = Carbon::parse($a->date->toDateString().' '.$a->start, $tz)->startOfMinute();

                return $slotStart->gte($cursor);
            })
            ->values();
    }

    /**
     * Inícios de horário já ocupados por pedidos (pendente/confirmado), como instante ISO8601 no fuso da app.
     *
     * @return array<string, true>
     */
    private static function takenPreferredStartIsoKeys(int $churchId, int $pastorId, ?int $ignoreAppointmentId, ?int $ignoreChurchSolicitationId): array
    {
        $tz = (string) config('app.timezone');
        $q = PastoralAppointment::query()
            ->where('church_id', $churchId)
            ->where('preferred_pastor_id', $pastorId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereNotNull('preferred_start');

        if ($ignoreAppointmentId !== null) {
            $q->where('id', '!=', $ignoreAppointmentId);
        }

        $keys = [];
        foreach ($q->get(['preferred_start']) as $row) {
            if ($row->preferred_start === null) {
                continue;
            }
            $iso = Carbon::parse($row->preferred_start)->timezone($tz)->startOfMinute()->toIso8601String();
            $keys[$iso] = true;
        }

        $solicitations = ChurchSolicitation::query()
            ->where('church_id', $churchId)
            ->where('assigned_pastor_id', $pastorId)
            ->where('type', 'pastor_visit')
            ->whereIn('status', ['pending', 'in_progress'])
            ->get(['id', 'meta']);

        foreach ($solicitations as $sol) {
            if ($ignoreChurchSolicitationId !== null && (int) $sol->id === $ignoreChurchSolicitationId) {
                continue;
            }
            $raw = data_get($sol->meta, 'pastoral_visit.preferred_start');
            if (! is_string($raw) || $raw === '') {
                continue;
            }
            try {
                $iso = Carbon::parse($raw)->timezone($tz)->startOfMinute()->toIso8601String();
                $keys[$iso] = true;
            } catch (Throwable) {
                continue;
            }
        }

        return $keys;
    }

    /**
     * Disponibilidades futuras que ainda não têm pedido pendente/confirmado no mesmo instante.
     *
     * @return Collection<int, PastoralAvailability>
     */
    public static function freeUpcomingCollection(
        int $churchId,
        int $pastorId,
        CarbonInterface $from,
        int $daysAhead = 90,
        ?int $ignoreConflictAppointmentId = null,
        ?int $ignoreChurchSolicitationId = null,
    ): Collection {
        $tz = (string) config('app.timezone');
        $taken = self::takenPreferredStartIsoKeys($churchId, $pastorId, $ignoreConflictAppointmentId, $ignoreChurchSolicitationId);

        return self::upcomingCollection($churchId, $pastorId, $from, $daysAhead)
            ->filter(function (PastoralAvailability $a) use ($taken, $tz) {
                $slotStart = Carbon::parse($a->date->toDateString().' '.$a->start, $tz)->startOfMinute()->toIso8601String();

                return ! isset($taken[$slotStart]);
            })
            ->values();
    }

    /**
     * @return array<int, array{value: string, label: string, modality: string}>
     */
    public static function upcomingSlotsForDisplay(
        int $churchId,
        int $pastorId,
        CarbonInterface $from,
        int $daysAhead = 90,
        int $maxSlots = 48,
        ?int $ignoreConflictAppointmentId = null,
        ?int $ignoreChurchSolicitationId = null,
    ): array {
        $tz = (string) config('app.timezone');
        $rows = [];
        foreach (self::freeUpcomingCollection($churchId, $pastorId, $from, $daysAhead, $ignoreConflictAppointmentId, $ignoreChurchSolicitationId) as $a) {
            $slotStart = Carbon::parse($a->date->toDateString().' '.$a->start, $tz)->startOfMinute();
            $slotEnd = Carbon::parse($a->date->toDateString().' '.$a->end, $tz);
            $modality = (string) ($a->modality ?? 'both');
            $suffix = match ($modality) {
                'presential' => ' · Presencial',
                'online' => ' · Online',
                default => ' · Presencial ou online',
            };
            $labelStart = $slotStart->locale('pt_BR')->isoFormat('ddd, D MMM · HH:mm');
            $labelEnd = $slotEnd->locale('pt_BR')->isoFormat('HH:mm');
            $rows[] = [
                'value' => $slotStart->toIso8601String(),
                'label' => $labelStart.' — '.$labelEnd.$suffix,
                'modality' => $modality,
            ];
            if (count($rows) >= $maxSlots) {
                break;
            }
        }

        return $rows;
    }

    public static function preferredStartIsAllowed(
        ?string $iso,
        int $churchId,
        int $pastorId,
        CarbonInterface $from,
        int $daysAhead = 90,
        ?int $ignoreConflictAppointmentId = null,
        ?int $ignoreChurchSolicitationId = null,
    ): bool {
        return self::findSlotMetadata($iso, $churchId, $pastorId, $from, $daysAhead, $ignoreConflictAppointmentId, $ignoreChurchSolicitationId) !== null;
    }

    /**
     * @return array{modality: string}|null
     */
    public static function findSlotMetadata(
        ?string $iso,
        int $churchId,
        int $pastorId,
        CarbonInterface $from,
        int $daysAhead = 90,
        ?int $ignoreConflictAppointmentId = null,
        ?int $ignoreChurchSolicitationId = null,
    ): ?array {
        if ($iso === null || $iso === '') {
            return null;
        }
        $tz = (string) config('app.timezone');
        $target = Carbon::parse($iso, $tz)->startOfMinute();

        foreach (self::freeUpcomingCollection($churchId, $pastorId, $from, $daysAhead, $ignoreConflictAppointmentId, $ignoreChurchSolicitationId) as $a) {
            $slotStart = Carbon::parse($a->date->toDateString().' '.$a->start, $tz)->startOfMinute();
            if ($slotStart->equalTo($target)) {
                return ['modality' => (string) ($a->modality ?? 'both')];
            }
        }

        return null;
    }
}
