<?php

namespace App\Support;

final class BaptismSolicitationStatus
{
    public const PENDING = 'pending';

    public const WAITING = 'waiting';

    public const BAPTIZED = 'baptized';

    public const ARCHIVED = 'archived';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::PENDING,
            self::WAITING,
            self::BAPTIZED,
            self::ARCHIVED,
        ];
    }

    /** @return array<string, string> */
    public static function tabLabels(): array
    {
        return [
            'pendente' => 'Pendente',
            'aguardando' => 'Aguardando',
            'batizados' => 'Batizados',
            'arquivados' => 'Arquivados',
        ];
    }

    public static function tabForStatus(string $status): string
    {
        return match ($status) {
            self::WAITING => 'aguardando',
            self::BAPTIZED => 'batizados',
            self::ARCHIVED => 'arquivados',
            default => 'pendente',
        };
    }

    public static function statusForTab(string $tab): string
    {
        return match ($tab) {
            'aguardando' => self::WAITING,
            'batizados' => self::BAPTIZED,
            'arquivados' => self::ARCHIVED,
            default => self::PENDING,
        };
    }

    public static function label(string $status): string
    {
        return match ($status) {
            self::PENDING => 'Pendente',
            self::WAITING => 'Aguardando',
            self::BAPTIZED => 'Batizado',
            self::ARCHIVED => 'Arquivado',
            'in_progress' => 'Aguardando',
            'completed' => 'Batizado',
            'cancelled' => 'Arquivado',
            default => $status,
        };
    }

    public static function allowsChat(string $status): bool
    {
        return in_array($status, [self::PENDING, self::WAITING, 'in_progress'], true);
    }

    public static function isTerminal(string $status): bool
    {
        return in_array($status, [self::BAPTIZED, self::ARCHIVED, 'completed', 'cancelled'], true);
    }

    /** @return list<array{value: string, label: string, description: string}> */
    public static function changeOptions(): array
    {
        return [
            [
                'value' => self::PENDING,
                'label' => 'Pendente',
                'description' => 'Novo pedido, ainda não tratado',
            ],
            [
                'value' => self::WAITING,
                'label' => 'Aguardando',
                'description' => 'Em acompanhamento até o batismo',
            ],
            [
                'value' => self::BAPTIZED,
                'label' => 'Batizado',
                'description' => 'Batismo realizado',
            ],
            [
                'value' => self::ARCHIVED,
                'label' => 'Arquivado',
                'description' => 'Encerrado sem seguimento na lista ativa',
            ],
        ];
    }
}
