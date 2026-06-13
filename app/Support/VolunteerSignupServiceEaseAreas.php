<?php

namespace App\Support;

/**
 * Áreas de facilidade no serviço (questionário v2) — slugs em JSON no banco.
 */
final class VolunteerSignupServiceEaseAreas
{
    /** @return array<string, string> */
    public static function labels(): array
    {
        return config('volunteer_signup.service_ease_areas', []);
    }

    /** @return list<string> */
    public static function allowedSlugs(): array
    {
        return array_keys(self::labels());
    }

    /**
     * @param  mixed  $stored
     * @return list<string>
     */
    public static function decode(mixed $stored): array
    {
        if (is_array($stored)) {
            $raw = $stored;
        } elseif (is_string($stored) && trim($stored) !== '') {
            $decoded = json_decode($stored, true);
            $raw = is_array($decoded) ? $decoded : array_map('trim', explode(',', $stored));
        } else {
            return [];
        }

        $allowed = array_flip(self::allowedSlugs());
        $out = [];
        foreach ($raw as $item) {
            $slug = trim((string) $item);
            if ($slug !== '' && isset($allowed[$slug])) {
                $out[] = $slug;
            }
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  array<int, mixed>|mixed  $slugs
     */
    public static function encode(mixed $slugs): ?string
    {
        $normalized = self::decode($slugs);

        return $normalized === [] ? null : json_encode($normalized, JSON_UNESCAPED_UNICODE);
    }

    public static function hasSelection(mixed $stored): bool
    {
        return self::decode($stored) !== [];
    }
}
