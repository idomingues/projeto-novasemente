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
        $trimmed = trim($fullName);
        if ($trimmed === '') {
            return null;
        }

        $parts = preg_split('/\s+/u', $trimmed, 2) ?: [];
        $first = trim((string) ($parts[0] ?? ''));
        $last = trim((string) ($parts[1] ?? ''));

        if ($first === '' || $last === '') {
            return null;
        }

        return [
            'first_name' => $first,
            'last_name' => $last,
        ];
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
