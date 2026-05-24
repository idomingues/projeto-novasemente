<?php

namespace App\Support;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Support\StorageUrl;

class SupportTicketAdminPresenter
{
    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'problem' => 'Problema',
            'suggestion' => 'Sugestão',
            'praise' => 'Elogio',
            'development' => 'A desenvolver',
            'pastoral' => 'Agendamento pastoral',
            default => 'Suporte do app',
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            AppSupportTicket::STATUS_OPEN => 'Aberto',
            AppSupportTicket::STATUS_IN_PROGRESS => 'Em andamento',
            AppSupportTicket::STATUS_WAITING_USER => 'Aguardando usuário',
            AppSupportTicket::STATUS_RESOLVED => 'Resolvido',
            AppSupportTicket::STATUS_CLOSED => 'Fechado',
            default => 'Aberto',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function statusOptions(): array
    {
        return collect(AppSupportTicket::statuses())
            ->map(fn (string $status) => [
                'value' => $status,
                'label' => self::statusLabel($status),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{ticket: array<string, mixed>, messages: array<int, array<string, mixed>>, supportUpdateUrl: string, supportDestroyUrl: string, supportCloseUrl: string, supportMessageStoreUrl: string, canManageTickets: bool}
     */
    public static function adminPayload(AppSupportTicket $ticket, User $viewer): array
    {
        $ticket->loadMissing('user:id,name');

        $messages = AppSupportMessage::query()
            ->where('ticket_id', $ticket->id)
            ->with(['senderUser:id,name'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (AppSupportMessage $m) => [
                'id' => $m->id,
                'senderType' => $m->sender_type,
                'senderUserId' => $m->sender_user_id,
                'senderName' => $m->senderUser?->name,
                'content' => $m->content,
                'createdAt' => $m->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $publicToken = $ticket->public_token;

        $canManage = $viewer->hasRole('super_admin') || $viewer->hasPermissionTo('support.manage');

        return [
            'ticket' => [
                'publicToken' => $publicToken,
                'type' => $ticket->type,
                'typeLabel' => self::typeLabel($ticket->type),
                'isGuest' => ! (bool) $ticket->user_id,
                'allowStaffInternalChat' => $ticket->type === 'pastoral'
                    && ! $ticket->user_id
                    && $ticket->pastoral_appointment_id
                    && $ticket->status === 'open',
                'status' => $ticket->status,
                'statusLabel' => self::statusLabel((string) $ticket->status),
                'message' => $ticket->message,
                'screenshotUrl' => $ticket->screenshot_path ? StorageUrl::publicMediaUrl($ticket->screenshot_path) : null,
                'screenshotExternalUrl' => $ticket->screenshot_url,
                'solutionText' => $ticket->solution_text,
                'forecastAt' => $ticket->forecast_at?->toDateString(),
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
                'ownerLabel' => $ticket->user_id ? ($ticket->user?->name ?? 'Usuário') : ($ticket->guest_name ?? 'Convidado'),
            ],
            'messages' => $messages,
            'supportUpdateUrl' => route('support.update', ['token' => $publicToken]),
            'supportDestroyUrl' => route('support.destroy', ['token' => $publicToken]),
            'supportCloseUrl' => route('support.close', ['token' => $publicToken]),
            'supportMessageStoreUrl' => route('support.messages.store', ['token' => $publicToken]),
            'canManageTickets' => $canManage,
            'statusOptions' => self::statusOptions(),
        ];
    }
}
