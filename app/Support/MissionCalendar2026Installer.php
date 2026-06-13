<?php

namespace App\Support;

use App\Models\Event;
use App\Models\MissionEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Instala o calendário missionário Nova Semente (jun–dez/2026) em mission_events.
 */
final class MissionCalendar2026Installer
{
    public const CALENDAR_START = '2026-06-01';

    public const CALENDAR_END = '2026-12-31';

    /**
     * @return array{created: int, updated: int, removed_from_events: int}
     */
    public static function install(int $churchId): array
    {
        $timezone = (string) config('app.timezone');
        $created = 0;
        $updated = 0;
        $removedFromEvents = 0;

        DB::transaction(function () use ($churchId, $timezone, &$created, &$updated, &$removedFromEvents) {
            foreach (NovaSementeMissionCalendar2026::events() as $row) {
                $startsAt = Carbon::parse($row['starts_at'].' 00:00:00', $timezone);
                $endsAt = isset($row['ends_at'])
                    ? Carbon::parse($row['ends_at'].' 23:59:59', $timezone)
                    : null;

                $attributes = [
                    'description' => $row['description'] ?? null,
                    'ends_at' => $endsAt,
                    'all_day' => true,
                    'location' => $row['location'] ?? null,
                    'color' => $row['color'] ?? self::colorForTitle($row['title']),
                ];

                $existing = MissionEvent::query()
                    ->where('church_id', $churchId)
                    ->where('title', $row['title'])
                    ->whereDate('starts_at', $startsAt->toDateString())
                    ->first();

                if ($existing) {
                    $existing->fill($attributes)->save();
                    $updated++;
                } else {
                    MissionEvent::query()->create(array_merge($attributes, [
                        'church_id' => $churchId,
                        'title' => $row['title'],
                        'starts_at' => $startsAt,
                    ]));
                    $created++;
                }

                $removedFromEvents += Event::query()
                    ->where('church_id', $churchId)
                    ->where('title', $row['title'])
                    ->whereDate('starts_at', $startsAt->toDateString())
                    ->delete();
            }
        });

        return [
            'created' => $created,
            'updated' => $updated,
            'removed_from_events' => $removedFromEvents,
        ];
    }

    public static function colorForTitle(string $title): string
    {
        if (str_contains($title, 'Tailândia') || str_contains($title, 'Mianmar')) {
            return '#D97706';
        }

        if (str_contains($title, 'Missão 360')) {
            return '#2563EB';
        }

        if (str_contains($title, 'Mission Day') || str_contains($title, 'Celebration')) {
            return '#0D9488';
        }

        if (str_contains($title, 'Sent')) {
            return '#7C3AED';
        }

        if (str_contains($title, 'Ação') || str_contains($title, 'Campanha')) {
            return '#059669';
        }

        return '#047857';
    }
}
