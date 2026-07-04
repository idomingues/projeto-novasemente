<?php

namespace App\Services;

interface RevistaAdventistaArchiveProvider
{
    public function sourceKey(): string;

    /**
     * @return array{ok: bool, years?: list<int>, error?: string}
     */
    public function fetchAvailableYears(): array;

    /**
     * @return array{ok: bool, editions?: list<array<string, mixed>>, error?: string}
     */
    public function fetchEditionsForYear(int $year): array;
}
