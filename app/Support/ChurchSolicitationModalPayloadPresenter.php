<?php

namespace App\Support;

use App\Http\Controllers\MobileChurchSolicitationController;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\User;

/**
 * Payload do modal de pedido (Atendimento Pastoral ou Pedidos de voluntário) — alinhado ao front {@see \App\Http\Controllers\SolicitationAdminController}.
 */
class ChurchSolicitationModalPayloadPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function forSolicitationsAdmin(ChurchSolicitation $s, ?User $user, bool $canManage, bool $canView): array
    {
        $base = self::base($s);

        return array_merge($base, [
            'updateUrl' => route('solicitations.update', $s),
            'messageStoreUrl' => route('solicitations.messages.store', $s),
            'canManage' => $canManage,
            'staffCanReply' => $canView && $s->allowsChat(),
            'canChat' => $s->allowsChat(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function forVolunteerRequestStaff(ChurchSolicitation $s, ?User $user): array
    {
        $base = self::base($s);
        $canManage = $user !== null && $user->can('manageVolunteerRequestAsStaff', $s);

        return array_merge($base, [
            /** Gestão interna (estado, notas, datas): mesmo PATCH que Atendimento Pastoral — não o PUT de conteúdo do pedido. */
            'updateUrl' => route('solicitations.update', $s),
            'messageStoreUrl' => route('volunteer-requests.staff.messages.store', $s),
            'canManage' => $canManage,
            'staffCanReply' => $canManage && $s->allowsChat(),
            'canChat' => $s->allowsChat(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function forVolunteerRequestLeader(ChurchSolicitation $s, ?User $user): array
    {
        $base = self::base($s);
        $canEditPending = $user !== null && $user->can('updateVolunteerRequestAsSubmitter', $s);

        return array_merge($base, [
            'updateUrl' => $canEditPending ? route('ministry-lead.volunteer-requests.update', $s) : null,
            'messageStoreUrl' => route('ministry-lead.volunteer-requests.messages.store', $s),
            'canManage' => false,
            'staffCanReply' => false,
            'canChat' => $s->allowsChat(),
        ]);
    }

    /**
     * @return array{solicitation: array<string, mixed>, messages: list<array<string, mixed>>}
     */
    private static function base(ChurchSolicitation $s): array
    {
        $s->loadMissing([
            'assignedPastor:id,name',
            'assignedVolunteer.user:id,name',
        ]);
        $messages = ChurchSolicitationMessage::query()
            ->where('church_solicitation_id', $s->id)
            ->with('senderUser:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (ChurchSolicitationMessage $m) => [
                'id' => $m->id,
                'senderType' => $m->sender_type,
                'senderUserId' => $m->sender_user_id,
                'senderName' => $m->senderUser?->name,
                'content' => $m->content,
                'createdAt' => $m->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'solicitation' => [
                'id' => $s->id,
                'type' => $s->type,
                'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => $s->type === 'leader_chat'
                    ? MobileChurchSolicitationController::leaderChatStatusLabel($s->status)
                    : MobileChurchSolicitationController::statusLabel($s->status),
                'subject' => $s->subject,
                'message' => $s->message,
                'meta' => $s->meta,
                'internalNotes' => $s->internal_notes,
                'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                'assignedPastorId' => $s->assigned_pastor_id,
                'assignedVolunteerId' => $s->assigned_volunteer_id,
                'assignedPastorName' => $s->assignedPastor?->name,
                'assignedVolunteerName' => $s->assignedVolunteer?->display_name,
                'createdAt' => $s->created_at?->toIso8601String(),
                'completedAt' => $s->completed_at?->toIso8601String(),
                'memberLabel' => $s->user?->name ?? 'Usuário #'.$s->user_id,
            ],
            'messages' => $messages,
        ];
    }
}
