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
        ], self::staffArchiveUrls($s, $canManage));
    }

    /**
     * @return array<string, mixed>
     */
    public static function forBaptismAdmin(ChurchSolicitation $s, ?User $user, bool $canManage, bool $canView): array
    {
        return array_merge(self::forSolicitationsAdmin($s, $user, $canManage, $canView), [
            'statusChangeOptions' => BaptismSolicitationStatus::changeOptions(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public static function forPastoralAdmin(ChurchSolicitation $s, ?User $user, bool $canManage, bool $canView): array
    {
        return array_merge(self::forSolicitationsAdmin($s, $user, $canManage, $canView), [
            'statusChangeOptions' => PastoralSolicitationStatus::changeOptions($s->type),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private static function staffArchiveUrls(ChurchSolicitation $s, bool $canManage): array
    {
        if (! $canManage) {
            return [];
        }

        $archiveRoute = match ($s->type) {
            'baptism' => null,
            MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST => 'volunteer-requests.staff.archive',
            MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST => 'communication-requests.archive',
            default => null,
        };
        $unarchiveRoute = match ($s->type) {
            'baptism' => null,
            MobileChurchSolicitationController::TYPE_VOLUNTEER_REQUEST => 'volunteer-requests.staff.unarchive',
            MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST => 'communication-requests.unarchive',
            default => null,
        };

        if ($archiveRoute === null || $unarchiveRoute === null) {
            return [];
        }

        $archived = $s->staff_archived_at !== null;

        return [
            'staffArchivedAt' => $s->staff_archived_at?->toIso8601String(),
            'archiveStaffUrl' => ! $archived ? route($archiveRoute, $s) : null,
            'unarchiveStaffUrl' => $archived ? route($unarchiveRoute, $s) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function forVolunteerRequestStaff(ChurchSolicitation $s, ?User $user): array
    {
        $base = self::base($s);
        $canManage = $user !== null && $user->can('manageVolunteerRequestAsStaff', $s);

        $canSuggestVolunteers = $canManage
            && $s->status === 'pending'
            && empty(($s->meta ?? [])['fulfilled_invitation_id']);

        return array_merge($base, [
            /** Gestão interna (estado, notas, datas): mesmo PATCH que Atendimento Pastoral — não o PUT de conteúdo do pedido. */
            'updateUrl' => route('solicitations.update', $s),
            'messageStoreUrl' => route('volunteer-requests.staff.messages.store', $s),
            'canManage' => $canManage,
            'staffCanReply' => $canManage && $s->allowsChat(),
            'canChat' => $s->allowsChat(),
            'suggestVolunteersUrl' => $canSuggestVolunteers
                ? route('volunteer-requests.staff.suggest-volunteers', $s)
                : null,
        ], self::staffArchiveUrls($s, $canManage));
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
     * @return array<string, mixed>
     */
    public static function forCommunicationRequestLeader(ChurchSolicitation $s, ?User $user): array
    {
        $base = self::base($s);
        $canEditPending = $user !== null && $user->can('updateCommunicationRequestAsSubmitter', $s);

        return array_merge($base, [
            'updateUrl' => $canEditPending ? route('communication-requests.update', $s) : null,
            'messageStoreUrl' => route('communication-requests.messages.store.leader', $s),
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
            'user:id,name,email,phone,photo_url',
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

        $payload = [
            'solicitation' => [
                'id' => $s->id,
                'type' => $s->type,
                'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => match (true) {
                    $s->type === 'baptism' => BaptismSolicitationStatus::label((string) $s->status),
                    $s->type === 'leader_chat' => PastoralSolicitationStatus::label((string) $s->status, 'leader_chat'),
                    in_array($s->type, [
                        'bible_study',
                        'baby_presentation',
                        'pastor_visit',
                        'other',
                        MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL,
                    ], true) => PastoralSolicitationStatus::label((string) $s->status),
                    default => MobileChurchSolicitationController::statusLabel($s->status),
                },
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
                'memberLabel' => $s->memberDisplayName(),
                'memberPhotoUrl' => $s->memberPhotoUrl(),
                'memberEmail' => $s->memberEmail(),
                'memberPhone' => $s->memberPhone(),
                'isInformalPastoral' => $s->type === MobileChurchSolicitationController::TYPE_PASTORAL_INFORMAL,
            ],
            'messages' => $messages,
        ];

        if ($s->type === MobileChurchSolicitationController::TYPE_COMMUNICATION_REQUEST) {
            $payload['communicationDetails'] = CommunicationRequestOptions::detailsForPanel($s->meta);
        }

        return $payload;
    }
}
