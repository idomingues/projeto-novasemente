<?php

namespace App\Support;

use Carbon\Carbon;

final class ConvivaSaturday
{
    public static function now(): Carbon
    {
        return Carbon::now(config('app.timezone'));
    }

    public static function todayDateString(): string
    {
        return self::now()->toDateString();
    }

    public static function isSaturday(?Carbon $moment = null): bool
    {
        return ($moment ?? self::now())->isSaturday();
    }

    /** Sábado de referência: hoje se for sábado; senão o sábado anterior. */
    public static function referenceSaturday(?Carbon $moment = null): Carbon
    {
        $day = ($moment ?? self::now())->copy()->startOfDay();
        if ($day->isSaturday()) {
            return $day;
        }

        return $day->previous(Carbon::SATURDAY);
    }

    public static function referenceSaturdayString(?Carbon $moment = null): string
    {
        return self::referenceSaturday($moment)->toDateString();
    }
}
