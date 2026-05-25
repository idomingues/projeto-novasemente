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

        if (self::normalizeBool($out['is_official_member'] ?? null) !== true) {
            unset($out['member_record_at_nova_semente'], $out['member_record_church']);
        } elseif (self::normalizeBool($out['member_record_at_nova_semente'] ?? null) !== false) {
            unset($out['member_record_church']);
        }

        if (self::normalizeBool($out['has_previous_ministry_volunteer_experience'] ?? null) !== true) {
            $out['previous_ministry_ids'] = [];
        }

        if (self::normalizeBool($out['is_active_in_ministry'] ?? null) !== true) {
            $out['active_ministry_ids'] = [];
        }

        if (self::normalizeBool($out['wants_other_ministry'] ?? null) !== true) {
            $out['other_ministry_ids'] = [];
        }

        $phone = trim((string) ($out['phone'] ?? ''));
        if ($phone === '') {
            $out['has_whatsapp'] = false;
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
