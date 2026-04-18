<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Services\SolicitationChatNotifier;
use App\Support\SolicitationAssignees;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MobileChurchSolicitationController extends Controller
{
    /** Tipos listados no hub (pedidos formais). «Falar com líder» é só em Mais → Contacto. */
    private const HUB_TYPES = ['baptism', 'baby_presentation', 'pastor_visit'];

    private const TYPES = ['baptism', 'baby_presentation', 'pastor_visit', 'leader_chat'];

    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'baptism' => 'Pedido de batismo',
            'baby_presentation' => 'Apresentação de bebé',
            'pastor_visit' => 'Visita aos pastores',
            'leader_chat' => 'Conversa com líder de ministério',
            default => $type,
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pendente',
            'in_progress' => 'Em tratamento',
            'completed' => 'Concluído',
            'cancelled' => 'Cancelado',
            default => $status,
        };
    }

    /** Rótulo de estado para conversas com líder (membro / líder). */
    public static function leaderChatStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Assunto aberto',
            'in_progress' => 'Assunto em curso',
            'completed' => 'Assunto finalizado',
            'cancelled' => 'Cancelada',
            default => self::statusLabel($status),
        };
    }

    public function hub(Request $request): Response
    {
        $churchId = $this->currentChurchId($request);
        $user = $request->user();

        $types = collect(self::HUB_TYPES)->map(fn (string $t) => [
            'type' => $t,
            'label' => self::typeLabel($t),
        ])->values()->all();

        $hubUrl = route('mobile.solicitations.hub');
        $mySolicitations = [];
        if ($user) {
            $mySolicitations = ChurchSolicitation::query()
                ->where('user_id', $user->id)
                ->whereIn('type', self::HUB_TYPES)
                ->with(['assignedPastor:id,name', 'assignedVolunteer.member:id,name'])
                ->orderByDesc('updated_at')
                ->limit(40)
                ->get()
                ->map(function (ChurchSolicitation $s) use ($hubUrl, $churchId) {
                    $payload = self::memberConversationPayload(
                        $s,
                        route('mobile.solicitations.messages.store', $s),
                        $hubUrl,
                        $hubUrl,
                    );

                    return array_merge($payload, [
                        'memberUpdateUrl' => route('mobile.solicitations.update', $s),
                        'memberCanEditDetails' => $s->status === 'pending',
                        'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                    ]);
                })
                ->values()
                ->all();
        }

        return Inertia::render('Mobile/Solicitations/Hub', [
            'types' => $types,
            'mineUrl' => $hubUrl,
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'mySolicitations' => $mySolicitations,
        ]);
    }

    public function create(Request $request, string $type): Response
    {
        abort_unless(in_array($type, self::TYPES, true), 404);

        $churchId = $this->currentChurchId($request);

        return Inertia::render('Mobile/Solicitations/Create', [
            'type' => $type,
            'typeLabel' => self::typeLabel($type),
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'volunteerOptions' => [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = $this->currentChurchId($request);
        SolicitationAssignees::normalizeAssignmentRequest($request);

        $valid = $request->validate(array_merge([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'message' => ['required', 'string', 'max:5000'],
            'meta' => ['nullable', 'array'],
        ], SolicitationAssignees::assignmentRules($churchId)));

        SolicitationAssignees::assertSingleAssignee($valid);

        if (($valid['type'] ?? '') === 'leader_chat') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'type' => 'Para falar com um líder de ministério, use «Falar com líder» em Mais.',
            ]);
        }

        $pastorId = $valid['assigned_pastor_id'] ?? null;
        $volunteerId = $valid['assigned_volunteer_id'] ?? null;

        $solicitation = ChurchSolicitation::create([
            'user_id' => $user->id,
            'member_id' => $user->member_id ? (int) $user->member_id : null,
            'type' => $valid['type'],
            'status' => 'pending',
            'message' => $valid['message'],
            'preferred_date' => $valid['preferred_date'] ?? null,
            'assigned_pastor_id' => $pastorId !== null ? (int) $pastorId : null,
            'assigned_volunteer_id' => $volunteerId !== null ? (int) $volunteerId : null,
            'meta' => $valid['meta'] ?? null,
        ]);

        if ($churchId !== null) {
            app(SolicitationChatNotifier::class)->notifyChurchSolicitationsHandlerOfNewRequest($solicitation, (int) $churchId);
        }

        return redirect()->route('mobile.solicitations.hub', [
            'solicitacao' => $solicitation->id,
            'painel' => 'detalhes',
        ])->with('success', 'Pedido enviado.');
    }

    public function mine(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        return redirect()->route('mobile.solicitations.hub', ['lista' => '1']);
    }

    public function show(Request $request, ChurchSolicitation $solicitation): Response
    {
        $this->authorize('view', $solicitation);
        $hub = route('mobile.solicitations.hub');
        $churchId = $this->currentChurchId($request);

        $finalizeLeaderChatUrl = $solicitation->type === 'leader_chat'
            ? route('mobile.solicitations.leader-chat.finalize', $solicitation)
            : null;

        return Inertia::render(
            'Mobile/Solicitations/Show',
            array_merge(
                self::memberConversationPayload(
                    $solicitation,
                    route('mobile.solicitations.messages.store', $solicitation),
                    $hub,
                    $hub,
                    $finalizeLeaderChatUrl,
                ),
                [
                    'memberUpdateUrl' => route('mobile.solicitations.update', $solicitation),
                    'memberCanEditDetails' => $solicitation->status === 'pending',
                    'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                ],
            ),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public static function memberConversationPayload(
        ChurchSolicitation $s,
        string $messageStoreUrl,
        string $hubUrl,
        string $mineUrl,
        ?string $finalizeLeaderChatUrl = null,
    ): array {
        $s->loadMissing([
            'assignedPastor:id,name',
            'assignedVolunteer.member:id,name',
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

        $isLeaderChat = $s->type === 'leader_chat';

        return [
            'solicitation' => [
                'id' => $s->id,
                'type' => $s->type,
                'typeLabel' => self::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => $isLeaderChat ? self::leaderChatStatusLabel($s->status) : self::statusLabel($s->status),
                'subject' => $s->subject,
                'message' => $s->message,
                'meta' => $s->meta,
                'preferredDate' => $s->preferred_date?->format('Y-m-d'),
                'assignedPastorId' => $s->assigned_pastor_id,
                'assignedVolunteerId' => $s->assigned_volunteer_id,
                'assignedPastorName' => $s->assignedPastor?->name,
                'assignedVolunteerName' => $s->assignedVolunteer?->display_name,
                'memberLabel' => $s->user?->name ?? 'Membro',
                'createdAt' => $s->created_at?->toIso8601String(),
                'completedAt' => $s->completed_at?->toIso8601String(),
            ],
            'messages' => $messages,
            'canChat' => $s->allowsChat(),
            'messageStoreUrl' => $messageStoreUrl,
            'hubUrl' => $hubUrl,
            'mineUrl' => $mineUrl,
            'canFinalizeLeaderChat' => $finalizeLeaderChatUrl !== null
                && $isLeaderChat
                && in_array($s->status, ['pending', 'in_progress'], true),
            'finalizeLeaderChatUrl' => $finalizeLeaderChatUrl,
        ];
    }

    public function updateAsMember(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('updateAsMember', $solicitation);

        if ($solicitation->type === 'leader_chat') {
            $valid = $request->validate([
                'subject' => ['required', 'string', 'max:150'],
                'message' => ['required', 'string', 'max:5000'],
                'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact'])],
            ]);

            $solicitation->update([
                'subject' => $valid['subject'],
                'message' => $valid['message'],
            ]);

            $returnTo = (string) ($valid['return_to'] ?? 'hub');

            if ($returnTo === 'leader_contact') {
                return redirect()->route('mobile.contact', [
                    'solicitacao' => $solicitation->id,
                    'painel' => 'detalhes',
                ])->with('success', 'Pedido atualizado.');
            }

            return redirect()->route('mobile.solicitations.hub', [
                'solicitacao' => $solicitation->id,
                'painel' => 'detalhes',
            ])->with('success', 'Pedido atualizado.');
        }

        $churchId = $this->currentChurchId($request);
        SolicitationAssignees::normalizeAssignmentRequest($request);

        $valid = $request->validate(array_merge([
            'message' => ['required', 'string', 'max:5000'],
            'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact'])],
        ], SolicitationAssignees::assignmentRules($churchId)));

        SolicitationAssignees::assertSingleAssignee($valid);

        $pastorId = $valid['assigned_pastor_id'] ?? null;
        $volunteerId = $valid['assigned_volunteer_id'] ?? null;

        $solicitation->update([
            'message' => $valid['message'],
            'preferred_date' => $valid['preferred_date'] ?? null,
            'assigned_pastor_id' => $pastorId !== null ? (int) $pastorId : null,
            'assigned_volunteer_id' => $volunteerId !== null ? (int) $volunteerId : null,
        ]);

        $returnTo = (string) ($valid['return_to'] ?? 'hub');

        if ($returnTo === 'leader_contact') {
            return redirect()->route('mobile.contact', [
                'solicitacao' => $solicitation->id,
                'painel' => 'detalhes',
            ])->with('success', 'Pedido atualizado.');
        }

        return redirect()->route('mobile.solicitations.hub', [
            'solicitacao' => $solicitation->id,
            'painel' => 'detalhes',
        ])->with('success', 'Pedido atualizado.');
    }

    public function sendMessage(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('sendMessageAsMember', $solicitation);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact'])],
        ]);

        ChurchSolicitationMessage::create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => 'member',
            'sender_user_id' => $request->user()->id,
            'content' => $valid['content'],
        ]);

        $solicitation->touch();

        app(SolicitationChatNotifier::class)->notifyStaffOfMemberMessage($solicitation, $request->user());

        if (($valid['return_to'] ?? '') === 'hub') {
            return redirect()->route('mobile.solicitations.hub', [
                'solicitacao' => $solicitation->id,
                'painel' => 'chat',
            ]);
        }

        if (($valid['return_to'] ?? '') === 'leader_contact') {
            return redirect()->route('mobile.contact', [
                'solicitacao' => $solicitation->id,
                'painel' => 'chat',
            ]);
        }

        return redirect()->route('mobile.solicitations.show', $solicitation);
    }

    public function finalizeLeaderChat(ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('finalizeLeaderChat', $solicitation);

        abort_unless($solicitation->type === 'leader_chat', 404);
        abort_unless(in_array($solicitation->status, ['pending', 'in_progress'], true), 403);

        $solicitation->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return redirect()->route('mobile.contact', ['lista' => '1'])->with('success', 'Assunto finalizado. A conversa ficou encerrada para si e para o líder.');
    }
}
