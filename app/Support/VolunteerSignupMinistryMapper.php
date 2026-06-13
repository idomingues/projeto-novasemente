<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * Converte nomes de departamentos (CSV gravado no cadastro) em IDs do catálogo da igreja.
 */
final class VolunteerSignupMinistryMapper
{
    /** Marcador interno: respondeu Sim, ainda não escolheu departamentos no catálogo. */
    public const YES_AWAITING_MINISTRY_PICK = '—';

    /**
     * Texto gravado em cadastros Sim/Não + lista de departamentos (CSV ou marcador pendente).
     */
    public static function storedTextForYesNoWithIds(bool $answeredYes, string $namesCsv): string
    {
        if (! $answeredYes) {
            return 'Não';
        }

        $names = trim($namesCsv);

        return $names !== '' ? $names : self::YES_AWAITING_MINISTRY_PICK;
    }
    /**
     * @param  Collection<int, object{id: int, name: string}>  $ministries
     * @return list<int>
     */
    public static function idsFromStoredNames(?string $stored, Collection $ministries): array
    {
        $text = trim((string) $stored);
        if ($text === '' || mb_strtolower($text) === 'não' || $text === self::YES_AWAITING_MINISTRY_PICK) {
            return [];
        }

        $wanted = collect(preg_split('/\s*,\s*/u', $text) ?: [])
            ->map(fn (string $name) => mb_strtolower(trim($name)))
            ->filter(fn (string $name) => $name !== '')
            ->unique()
            ->values();

        if ($wanted->isEmpty()) {
            return [];
        }

        $byName = [];
        foreach ($ministries as $ministry) {
            $key = mb_strtolower(trim((string) $ministry->name));
            if ($key !== '') {
                $byName[$key] = (int) $ministry->id;
            }
        }

        $ids = [];
        foreach ($wanted as $name) {
            if (isset($byName[$name])) {
                $ids[] = $byName[$name];
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Inferência Sim/Não a partir do texto gravado em cadastros antigos (null = ainda não respondeu).
     */
    public static function inferYesNoFromStoredText(?string $stored, bool $hasMappedIds): ?bool
    {
        if ($hasMappedIds) {
            return true;
        }

        $text = trim((string) $stored);
        if ($text === self::YES_AWAITING_MINISTRY_PICK) {
            return true;
        }

        if ($text === '') {
            return null;
        }

        return mb_strtolower($text) !== 'não';
    }

    /**
     * IDs selecionados ou texto legado já gravado — evita alerta falso por nomes não mapeados ao catálogo.
     *
     * @param  array<int, mixed>  $ids
     */
    public static function hasMinistrySelection(array $ids, ?string $storedText): bool
    {
        foreach ($ids as $id) {
            if ((int) $id > 0) {
                return true;
            }
        }

        $text = trim((string) $storedText);
        if ($text === self::YES_AWAITING_MINISTRY_PICK) {
            return false;
        }

        return $text !== '' && mb_strtolower($text) !== 'não';
    }
}
