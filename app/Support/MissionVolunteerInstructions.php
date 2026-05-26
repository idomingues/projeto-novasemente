<?php

namespace App\Support;

final class MissionVolunteerInstructions
{
    /** @return list<string> */
    public static function lines(): array
    {
        $lines = config('mission.post_registration_instructions', []);

        return is_array($lines) ? array_values(array_filter($lines, fn ($line) => is_string($line) && trim($line) !== '')) : [];
    }
}
