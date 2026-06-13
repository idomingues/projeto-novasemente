<?php

namespace App\Support;

/**
 * Normaliza payload do questionário (ramificações Sim/Não) antes de gravar.
 */
final class VolunteerSignupPayloadNormalizer
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function applyBranching(array $payload): array
    {
        $out = $payload;

        if (self::normalizeBool($out['has_social_networks'] ?? null) !== true) {
            $out['social_network_profiles'] = null;
        }

        $phone = trim((string) ($out['phone'] ?? ''));
        if ($phone === '') {
            $out['has_whatsapp'] = false;
        }

        if (array_key_exists('service_ease_areas', $out)) {
            $out['service_ease_areas'] = VolunteerSignupServiceEaseAreas::decode($out['service_ease_areas']);
        }

        return $out;
    }

    private static function normalizeBool(mixed $value): ?bool
    {
        if ($value === true || $value === 1 || $value === '1' || $value === 'true') {
            return true;
        }
        if ($value === false || $value === 0 || $value === '0' || $value === 'false') {
            return false;
        }

        return null;
    }
}
