<?php

namespace App\Support;

use App\Models\AppSupportMessage;
use App\Models\PastoralAppointment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MemberPastoralAppointmentHubPayload
{
    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pendente',
            'confirmed' => 'Confirmado',
            'cancelled' => 'Cancelado',
            'completed' => 'Concluído',
            default => $status,
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function rowsForMember(Request $request, int $churchId, int $userId): array
    {
        $appointments = PastoralAppointment::query()
            ->where('church_id', $churchId)
            ->where('requester_user_id', $userId)
            ->with([
                'preferredPastor:id,name',
                'supportTicket:id,public_token,status,user_id,message,solution_text,created_at,closed_at',
            ])
            ->orderByDesc('created_at')
            ->limit(80)
            ->get();

        return $appointments
            ->map(fn (PastoralAppointment $a) => self::row($request, $a))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public static function row(Request $request, PastoralAppointment $apt): array
    {
        $user = $request->user();
        $ticket = $apt->supportTicket;

        $messages = [];
        if ($ticket) {
            $messages = AppSupportMessage::query()
                ->where('ticket_id', $ticket->id)
                ->with('senderUser:id,name')
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
        }

        $hasOwner = $ticket && ! empty($ticket->user_id);
        $isOwner = $ticket && $user && (int) $ticket->user_id === (int) $user->id;
        $canChat = (bool) $hasOwner && (bool) $isOwner && $ticket->status === 'open';

        $editPastors = [];
        if ($apt->status === 'pending') {
            $editPayload = PastoralBookingInertiaProps::pastorPayload($request, (int) $apt->id);
            $editPastors = $editPayload['pastors'] ?? [];
        }

        return [
            'id' => $apt->id,
            'status' => $apt->status,
            'statusLabel' => self::statusLabel((string) $apt->status),
            'typeLabel' => 'Horário com pastor',
            'requesterName' => $apt->requester_name,
            'preferredPastorId' => $apt->preferred_pastor_id,
            'preferredStart' => $apt->preferred_start?->toIso8601String(),
            'preferredModality' => $apt->preferred_modality,
            'subject' => $apt->subject,
            'notes' => $apt->notes,
            'notesPreview' => Str::limit((string) ($apt->notes ?? ''), 120),
            'pastorName' => $apt->preferredPastor?->name,
            'updateUrl' => route('mobile.pastoral-appointments.update', $apt),
            'createdAt' => $apt->created_at?->toIso8601String(),
            'ticket' => $ticket ? [
                'publicToken' => $ticket->public_token,
                'status' => $ticket->status,
                'message' => $ticket->message,
                'solutionText' => $ticket->solution_text,
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
            ] : null,
            'messages' => $messages,
            'canChat' => $canChat,
            'messageStoreUrl' => $ticket ? route('mobile.support.messages.store', ['token' => $ticket->public_token]) : null,
            'editPastors' => $editPastors,
        ];
    }
}
