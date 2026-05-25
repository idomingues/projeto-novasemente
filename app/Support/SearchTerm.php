<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;

class SearchTerm
{
    public static function whereAnyColumnLike(EloquentBuilder|QueryBuilder $query, array $columns, string $search): void
    {
        self::applyAnyColumnLike($query, $columns, $search, false);
    }

    public static function orWhereAnyColumnLike(EloquentBuilder|QueryBuilder $query, array $columns, string $search): void
    {
        self::applyAnyColumnLike($query, $columns, $search, true);
    }

    private static function applyAnyColumnLike(
        EloquentBuilder|QueryBuilder $query,
        array $columns,
        string $search,
        bool $orGroup,
    ): void {
        $pattern = self::likePattern($search);
        if ($pattern === null || $columns === []) {
            return;
        }

        $clause = function ($sub) use ($columns, $pattern) {
            foreach ($columns as $index => $column) {
                $sql = self::sqlNormalizeExpression($column).' LIKE ?';
                if ($index === 0) {
                    $sub->whereRaw($sql, [$pattern]);
                } else {
                    $sub->orWhereRaw($sql, [$pattern]);
                }
            }
        };

        if ($orGroup) {
            $query->orWhere($clause);
        } else {
            $query->where($clause);
        }
    }

    public static function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value), 'UTF-8');
        if ($value === '') {
            return '';
        }

        if (class_exists(\Normalizer::class)) {
            $nfd = \Normalizer::normalize($value, \Normalizer::FORM_D);
            if (is_string($nfd)) {
                $stripped = preg_replace('/\p{M}/u', '', $nfd);

                return is_string($stripped) && $stripped !== '' ? $stripped : $nfd;
            }
        }

        return self::stripAccentsFallback($value);
    }

    public static function likePattern(string $search): ?string
    {
        $normalized = self::normalize($search);
        if ($normalized === '') {
            return null;
        }

        return '%'.str_replace(['%', '_'], ['\\%', '\\_'], $normalized).'%';
    }

    private static function stripAccentsFallback(string $value): string
    {
        return strtr($value, self::accentReplacements());
    }

    private static function sqlNormalizeExpression(string $column): string
    {
        $expr = "LOWER({$column})";
        foreach (self::accentReplacements() as $accented => $plain) {
            $expr = "REPLACE({$expr}, '{$accented}', '{$plain}')";
        }

        return $expr;
    }

    /** @return array<string, string> */
    private static function accentReplacements(): array
    {
        return [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'ñ' => 'n',
        ];
    }
}
