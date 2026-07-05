<?php

namespace App\Support;

use Illuminate\Support\Str;

final class PublicationDemoMarker
{
    public const PREFIX = '[DEMO FEED]';

    public static function title(string $label): string
    {
        return self::PREFIX.' '.$label;
    }

    public static function slug(string $suffix): string
    {
        return 'demo-feed-'.Str::slug($suffix);
    }

    public static function isDemoTitle(?string $title): bool
    {
        return is_string($title) && str_starts_with($title, self::PREFIX);
    }
}
