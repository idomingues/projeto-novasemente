<?php

namespace App\Support;

final class PastoralSolicitationStatus
{
    public const PENDING = 'pending';

    public const COMPLETED = 'completed';

    public const CANCELLED = 'cancelled';

    public const ARCHIVED = 'archived';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::PENDING,
            self::COMPLETED,
            self::CANCELLED,
            self::ARCHIVED,
        ];
    }

    /** @return array<string, string> */
    public static function tabLabels(): array
    {
        return [
            'pendente' => 'Pendente',
            'concluidos' => 'Concluídos',
            'cancelados' => 'Cancelados',
            'arquivados' => 'Arquivados',
        ];
    }

    /** @return list<string> */
    public static function statusesForTab(string $tab): array
    {
        return match ($tab) {
            'concluidos' => [self::COMPLETED],
            'cancelados' => [self::CANCELLED],
            'arquivados' => [self::ARCHIVED],
            default => [self::PENDING, 'in_progress'],
        };
    }

    public static function tabForStatus(string $status): string
    {
        return match ($status) {
            self::COMPLETED => 'concluidos',
            self::CANCELLED => 'cancelados',
            self::ARCHIVED => 'arquivados',
            'in_progress' => 'pendente',
            default => 'pendente',
        };
    }

    public static function label(string $status, ?string $type = null): string
    {
        if ($type === 'leader_chat') {
            return match ($status) {
                self::PENDING, 'in_progress' => 'Assunto aberto',
                self::COMPLETED => 'Assunto finalizado',
                self::CANCELLED => 'Cancelada',
                self::ARCHIVED => 'Arquivada',
                default => $status,
            };
        }

        return match ($status) {
            self::PENDING, 'in_progress' => 'Pendente',
            self::COMPLETED => 'Concluído',
            self::CANCELLED => 'Cancelado',
            self::ARCHIVED => 'Arquivado',
            default => $status,
        };
    }

    public static function allowsChat(string $status): bool
    {
        return in_array($status, [self::PENDING, 'in_progress'], true);
    }

    /** @return list<array{value: string, label: string, description: string}> */
    public static function changeOptions(?string $type = null): array
    {
        if ($type === 'leader_chat') {
            return [
                [
                    'value' => self::PENDING,
                    'label' => 'Assunto aberto',
                    'description' => 'Conversa ativa com o membro ou líder',
                ],
                [
                    'value' => self::COMPLETED,
                    'label' => 'Assunto finalizado',
                    'description' => 'Tema encerrado para ambas as partes',
                ],
                [
                    'value' => self::CANCELLED,
                    'label' => 'Cancelada',
                    'description' => 'Pedido não será seguido',
                ],
                [
                    'value' => self::ARCHIVED,
                    'label' => 'Arquivada',
                    'description' => 'Fora da lista ativa da equipe',
                ],
            ];
        }

        return [
            [
                'value' => self::PENDING,
                'label' => 'Pendente',
                'description' => 'Aguardando primeiro atendimento',
            ],
            [
                'value' => self::COMPLETED,
                'label' => 'Concluído',
                'description' => 'Pedido atendido ou encerrado com sucesso',
            ],
            [
                'value' => self::CANCELLED,
                'label' => 'Cancelado',
                'description' => 'Não será seguido pela equipe',
            ],
            [
                'value' => self::ARCHIVED,
                'label' => 'Arquivado',
                'description' => 'Fora da lista ativa — consulta em Arquivados',
            ],
        ];
    }

    /** @return list<string>|null */
    public static function pastoralAppointmentStatusesForTab(string $tab): ?array
    {
        return match ($tab) {
            'pendente' => ['pending'],
            'concluidos' => ['confirmed', 'completed'],
            'cancelados' => ['cancelled'],
            'arquivados' => [],
            default => ['pending'],
        };
    }
}
