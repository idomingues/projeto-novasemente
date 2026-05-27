<?php

namespace App\Support;

class AppSupportTicketOptions
{
    public const DEMAND_CATEGORY_INTERNAL = 'internal';

    public const DEMAND_CATEGORY_CLIENT = 'client';

    /** @var array<string, string> */
    public const DEMAND_CATEGORIES = [
        self::DEMAND_CATEGORY_INTERNAL => 'Demanda interna',
        self::DEMAND_CATEGORY_CLIENT => 'Demanda do cliente',
    ];

    /** @var array<string, string> */
    public const PRIORITIES = [
        'low' => 'Baixa',
        'medium' => 'Média',
        'high' => 'Alta',
        'urgent' => 'Urgente',
    ];

    public static function demandCategoryLabel(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return self::DEMAND_CATEGORIES[$value] ?? $value;
    }

    public static function priorityLabel(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return self::PRIORITIES[$value] ?? $value;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function demandCategoryOptions(): array
    {
        return collect(self::DEMAND_CATEGORIES)
            ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->all();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function priorityOptions(): array
    {
        return collect(self::PRIORITIES)
            ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->all();
    }
}
