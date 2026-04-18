<?php

namespace App\Support;

use App\Models\AppSupportTicket;
use App\Models\PastoralAppointment;
use Illuminate\Support\Str;

class PastoralAppointmentConversation
{
    public static function ensureTicket(PastoralAppointment $appointment): AppSupportTicket
    {
        if ($appointment->support_ticket_id) {
            return AppSupportTicket::query()->findOrFail($appointment->support_ticket_id);
        }

        $requesterLabel = $appointment->requester_name
            ?: ($appointment->requesterUser?->name ?? 'Pedido');

        $lines = [
            'Agendamento pastoral #'.$appointment->id,
            'Nome: '.$requesterLabel,
            $appointment->subject ? 'Assunto: '.$appointment->subject : null,
            $appointment->notes ? 'Notas: '.$appointment->notes : null,
        ];

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $appointment->requester_user_id,
            'member_id' => null,
            'pastoral_appointment_id' => $appointment->id,
            'type' => 'pastoral',
            'message' => implode("\n\n", array_filter($lines, fn ($l) => $l !== null && $l !== '')),
            'guest_name' => $appointment->requester_user_id ? null : $requesterLabel,
            'guest_email' => null,
            'guest_phone' => null,
            'status' => 'open',
        ]);

        $appointment->forceFill(['support_ticket_id' => $ticket->id])->save();

        return $ticket;
    }
}
