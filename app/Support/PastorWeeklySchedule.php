<?php

namespace App\Support;

use App\Models\Pastor;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class PastorWeeklySchedule
{
    /** @var list<string> */
    public const MODALITIES = ['presential', 'online', 'both'];

    /**
     * @param  array<int, array{weekday: int, start: string, end: string, modality?: string}>|null  $rows
     * @return array<int, array{weekday: int, start: string, end: string, modality: string}>
     */
    public static function normalize(?array $rows): array
    {
        if ($rows === null || $rows === []) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $w = (int) ($row['weekday'] ?? 0);
            $start = isset($row['start']) ? trim((string) $row['start']) : '';
            $end = isset($row['end']) ? trim((string) $row['end']) : '';
            if ($w < 1 || $w > 7 || $start === '' || $end === '') {
                continue;
            }
            $m = strtolower(trim((string) ($row['modality'] ?? '')));
            if (! in_array($m, self::MODALITIES, true)) {
                $m = 'both';
            }
            $out[] = ['weekday' => $w, 'start' => $start, 'end' => $end, 'modality' => $m];
        }

        return array_values($out);
    }

    /**
     * @return array<int, array{value: string, label: string, modality: string}>
     */
    public static function upcomingSlots(Pastor $pastor, CarbonInterface $from, int $daysAhead = 21, int $maxSlots = 48): array
    {
        $rules = self::normalize($pastor->weekly_schedule);
        if ($rules === []) {
            return [];
        }

        $tz = config('app.timezone');
        $start = Carbon::parse($from->toDateTimeString(), $tz)->startOfMinute();
        $endDay = $start->copy()->addDays(max(1, $daysAhead))->endOfDay();

        $seen = [];
        $rows = [];

        for ($day = $start->copy()->startOfDay(); $day->lte($endDay); $day->addDay()) {
            $dow = (int) $day->isoWeekday();
            foreach ($rules as $rule) {
                if ((int) $rule['weekday'] !== $dow) {
                    continue;
                }
                $slotStart = Carbon::parse($day->format('Y-m-d').' '.$rule['start'], $tz);
                if ($slotStart->lt($start)) {
                    continue;
                }
                $key = $slotStart->toIso8601String();
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                $slotEnd = Carbon::parse($day->format('Y-m-d').' '.$rule['end'], $tz);
                $labelStart = $slotStart->locale('pt_BR')->isoFormat('ddd, D MMM · HH:mm');
                $labelEnd = $slotEnd->locale('pt_BR')->isoFormat('HH:mm');
                $modality = (string) $rule['modality'];
                $suffix = match ($modality) {
                    'presential' => ' · Presencial',
                    'online' => ' · Online',
                    default => ' · Presencial ou online',
                };

                $rows[] = [
                    'value' => $key,
                    'label' => $labelStart.' — '.$labelEnd.$suffix,
                    'modality' => $modality,
                ];

                if (count($rows) >= $maxSlots) {
                    return self::sortSlotRows($rows);
                }
            }
        }

        return self::sortSlotRows($rows);
    }

    /**
     * @return array<int, array{value: string, label: string, modality: string}>
     */
    public static function upcomingSlotsForDisplay(Pastor $pastor, CarbonInterface $from, int $daysAhead = 21, int $maxSlots = 48): array
    {
        return self::upcomingSlots($pastor, $from, $daysAhead, $maxSlots);
    }

    /**
     * @param  array<int, array{value: string, label: string, modality: string}>  $rows
     * @return array<int, array{value: string, label: string, modality: string}>
     */
    private static function sortSlotRows(array $rows): array
    {
        return Collection::make($rows)
            ->sortBy(fn (array $r) => $r['value'])
            ->values()
            ->all();
    }

    /**
     * @return array{modality: string}|null
     */
    public static function findSlotMetadata(?string $iso, Pastor $pastor, CarbonInterface $from, int $daysAhead = 21, int $maxSlots = 96): ?array
    {
        if ($iso === null || $iso === '') {
            return null;
        }

        $tz = config('app.timezone');
        $target = Carbon::parse($iso, $tz)->startOfMinute();

        foreach (self::upcomingSlots($pastor, $from, $daysAhead, $maxSlots) as $slot) {
            if (Carbon::parse($slot['value'], $tz)->startOfMinute()->equalTo($target)) {
                return ['modality' => (string) $slot['modality']];
            }
        }

        return null;
    }

    public static function preferredStartIsAllowed(?string $iso, Pastor $pastor, CarbonInterface $from, int $daysAhead = 21, int $maxSlots = 96): bool
    {
        return self::findSlotMetadata($iso, $pastor, $from, $daysAhead, $maxSlots) !== null;
    }
}
