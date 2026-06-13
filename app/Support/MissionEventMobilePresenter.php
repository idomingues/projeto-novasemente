<?php

namespace App\Support;

use App\Models\MissionEvent;
use Illuminate\Support\Collection;

final class MissionEventMobilePresenter
{
    /** @return array<string, mixed> */
    public static function listRow(MissionEvent $event, Collection $churchEvents): array
    {
        $donor = self::contentDonor($event, $churchEvents);

        return EventFormSupport::mobileListPayload(
            (int) $event->id,
            (string) $event->title,
            self::preferText($event->description, $donor?->description),
            $event->starts_at,
            $event->ends_at,
            (bool) $event->all_day,
            self::preferText($event->location, $donor?->location),
            self::preferText($event->price, $donor?->price),
            self::preferText($event->purchase_url, $donor?->purchase_url),
            self::preferText($event->video_type, $donor?->video_type),
            self::preferText($event->video_url, $donor?->video_url),
            $event->youtube_embed_url,
            self::preferText($event->image_url, $donor?->image_url),
            self::preferText($event->color, $donor?->color),
        );
    }

    /**
     * @param  Collection<int, MissionEvent>  $churchEvents
     */
    public static function contentDonor(MissionEvent $event, Collection $churchEvents): ?MissionEvent
    {
        if (self::hasRichText($event->description)) {
            return null;
        }

        return $churchEvents
            ->filter(fn (MissionEvent $candidate) => $candidate->id !== $event->id)
            ->filter(fn (MissionEvent $candidate) => self::titlesMatch($event->title, $candidate->title))
            ->filter(fn (MissionEvent $candidate) => self::hasRichText($candidate->description)
                || self::hasRichText($candidate->price)
                || filled(trim((string) ($candidate->image_url ?? ''))))
            ->sortByDesc(fn (MissionEvent $candidate) => strlen(trim((string) ($candidate->description ?? ''))))
            ->first();
    }

    private static function titlesMatch(string $left, string $right): bool
    {
        if (mb_strtolower(trim($left)) === mb_strtolower(trim($right))) {
            return true;
        }

        if (self::isMissionDayTitle($left) && self::isMissionDayTitle($right)) {
            return true;
        }

        return false;
    }

    private static function isMissionDayTitle(string $title): bool
    {
        return (bool) preg_match('/mission\s*day/ui', $title);
    }

    private static function hasRichText(?string $value): bool
    {
        return filled(trim((string) ($value ?? '')));
    }

    private static function preferText(?string $primary, ?string $fallback): ?string
    {
        return self::hasRichText($primary) ? trim((string) $primary) : (
            self::hasRichText($fallback) ? trim((string) $fallback) : (
                filled($primary) ? trim((string) $primary) : (
                    filled($fallback) ? trim((string) $fallback) : null
                )
            )
        );
    }
}
