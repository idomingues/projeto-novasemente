<?php

namespace App\Support;

use App\Models\SharedTalentListing;
use App\Models\TalentListing;

final class TalentDemoListing
{
    public const MARKER_PREFIX = '__demo_listing__:';

    public const CONNECTION_SLUG = 'talent_connection_v1';

    public const SHARED_SLUG = 'shared_talent_v1';

    public static function marker(string $slug): string
    {
        return self::MARKER_PREFIX.$slug;
    }

    public static function isDemo(?string $notes): bool
    {
        return is_string($notes) && str_starts_with($notes, self::MARKER_PREFIX);
    }

    public static function isDemoTalentListing(TalentListing $listing): bool
    {
        return self::isDemo($listing->notes);
    }

    public static function isDemoSharedTalentListing(SharedTalentListing $listing): bool
    {
        return self::isDemo($listing->notes);
    }
}
