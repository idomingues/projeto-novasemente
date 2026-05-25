<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

/**
 * Nome completo do voluntário: exige nome e sobrenome (mínimo duas partes).
 */
final class VolunteerSignupName
{
    public const FULL_NAME_REQUIRED_MESSAGE = 'Informe o nome completo (nome e sobrenome).';

    /**
     * @return array{first_name: string, last_name: string}|null
     */
    public static function split(string $fullName): ?array
    {
        $trimmed = self::normalize($fullName);
        if ($trimmed === '') {
            return null;
        }

        $parts = preg_split('/\s+/u', $trimmed, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if (count($parts) < 2) {
            return null;
        }

        $first = trim((string) $parts[0]);
        $last = trim(implode(' ', array_slice($parts, 1)));

        if ($first === '' || $last === '') {
            return null;
        }

        return [
            'first_name' => $first,
            'last_name' => $last,
        ];
    }

    public static function normalize(string $fullName): string
    {
        $normalized = preg_replace(
            '/[\x{00a0}\x{1680}\x{2000}-\x{200b}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}]/u',
            ' ',
            trim($fullName)
        ) ?? trim($fullName);

        return trim(preg_replace('/\s+/u', ' ', $normalized) ?? $normalized);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    public static function assertValidInPayload(array $validated): void
    {
        $first = trim((string) ($validated['first_name'] ?? ''));
        $last = trim((string) ($validated['last_name'] ?? ''));

        if ($first === '' || $last === '') {
            throw ValidationException::withMessages([
                'full_name' => [self::FULL_NAME_REQUIRED_MESSAGE],
            ]);
        }

        $parts = self::split($first.' '.$last);
        if ($parts === null) {
            throw ValidationException::withMessages([
                'full_name' => [self::FULL_NAME_REQUIRED_MESSAGE],
            ]);
        }
    }
}
