<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\Pastor;
use App\Models\PastoralAvailability;
use App\Services\SolicitationChatNotifier;
use App\Support\PastoralBookingInertiaProps;
use App\Support\SolicitationAssignees;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MobileChurchSolicitationController extends Controller
{
    /** Tipos listados no hub (pedidos formais). «Falar com líder» é só em Mais → Contato. */
    private const HUB_TYPES = ['baptism', 'bible_study', 'baby_presentation', 'pastor_visit', 'other'];

    private const TYPES = ['baptism', 'bible_study', 'baby_presentation', 'pastor_visit', 'other', 'leader_chat'];

    /** Criado só via fluxo dedicado (líder/admin), não pelo hub móvel de membros. */
    public const TYPE_VOLUNTEER_REQUEST = 'volunteer_request';
    public const TYPE_COMMUNICATION_REQUEST = 'communication_request';

    /** Tipos com painel próprio — não listar em Atendimento Pastoral (`solicitations.index`). */
    public const TYPES_OUTSIDE_PASTORAL_INDEX = [
        self::TYPE_VOLUNTEER_REQUEST,
        self::TYPE_COMMUNICATION_REQUEST,
    ];

    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'baptism' => 'Pedido de batismo',
            'bible_study' => 'Pedido de estudo bíblico',
            'baby_presentation' => 'Apresentação de bebé',
            'pastor_visit' => 'Visita aos pastores',
            'leader_chat' => 'Conversa com líder de ministério',
            'volunteer_request' => 'Pedido de voluntário',
            'communication_request' => 'Solicitação de comunicação',
            'other' => 'Outros',
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

    /**
     * @return array{start: \Carbon\Carbon, modality: string}
     */
    private static function resolvePastoralVisitSlot(
        int $churchId,
        int $pastorId,
        string $preferredRaw,
        ?string $preferredModalityInput,
        ?int $ignoreChurchSolicitationId,
    ): array {
        Pastor::query()
            ->where('church_id', $churchId)
            ->where('id', $pastorId)
            ->firstOrFail();

        $from = Carbon::now((string) config('app.timezone'))->startOfMinute();

        if (PastoralAvailability::freeUpcomingCollection($churchId, $pastorId, $from, 90, null, $ignoreChurchSolicitationId)->isEmpty()) {
            throw ValidationException::withMessages([
                'assigned_pastor_id' => 'Não é possível enviar o pedido: não há horários livres na agenda deste pastor.',
            ]);
        }

        if (! PastoralAvailability::preferredStartIsAllowed($preferredRaw, $churchId, $pastorId, $from, 90, null, $ignoreChurchSolicitationId)) {
            throw ValidationException::withMessages([
                'preferred_start' => 'Escolha um dos horários livres disponíveis para este pastor.',
            ]);
        }

        $slotMeta = PastoralAvailability::findSlotMetadata($preferredRaw, $churchId, $pastorId, $from, 90, null, $ignoreChurchSolicitationId);
        $slotModality = $slotMeta['modality'] ?? 'both';
        if ($slotModality === 'both') {
            $m = $preferredModalityInput ?? null;
            if ($m !== 'presential' && $m !== 'online') {
                throw ValidationException::withMessages([
                    'preferred_modality' => 'Indique se prefere atendimento presencial ou online.',
                ]);
            }
            $preferredModality = $m;
        } else {
            $preferredModality = (string) $slotModality;
        }

        return [
            'start' => Carbon::parse($preferredRaw)->timezone((string) config('app.timezone'))->startOfMinute(),
            'modality' => $preferredModality,
        ];
    }

    public function hub(Request $request): Response
    {
        $churchId = $this->currentChurchId($request);
        $user = $request->user();

        if ($user === null) {
            return Inertia::render('Mobile/Solicitations/GuestGate', [
                'registerUrl' => route('register'),
                'redirectAfterLogin' => route('mobile.solicitations.hub', [], false),
                'continueUrl' => route('mobile.home', [], false),
            ]);
        }

        $types = collect(self::HUB_TYPES)->map(fn (string $t) => [
            'type' => $t,
            'label' => self::typeLabel($t),
        ])->values()->all();

        $hubUrl = route('mobile.solicitations.hub');
        $mySolicitations = [];
        if ($user) {
            $mySolicitations = ChurchSolicitation::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->where('user_id', $user->id)
                ->whereNull('member_hidden_at')
                ->whereIn('type', array_merge(self::HUB_TYPES, [self::TYPE_VOLUNTEER_REQUEST]))
                ->with(['assignedPastor:id,name', 'assignedVolunteer.user:id,name'])
                ->orderByDesc('updated_at')
                ->limit(40)
                ->get()
                ->map(function (ChurchSolicitation $s) use ($hubUrl, $churchId, $request) {
                    $payload = self::memberConversationPayload(
                        $s,
                        route('mobile.solicitations.messages.store', $s),
                        $hubUrl,
                        $hubUrl,
                        null,
                        false,
                    );

                    return array_merge($payload, [
                        'memberUpdateUrl' => route('mobile.solicitations.update', $s),
                        'memberCanEditDetails' => $s->status === 'pending',
                        'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                        'memberPastoralBooking' => $s->type === 'pastor_visit' && $s->status === 'pending' && $churchId !== null
                            ? PastoralBookingInertiaProps::pastorPayload($request, null, (int) $s->id)
                            : null,
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
            'pastoralBooking' => PastoralBookingInertiaProps::forRequest($request),
            'pastoralAgendaUrl' => route('mobile.pastoral-appointments.request', [], false),
        ]);
    }

    /**
     * App mobile: só pedidos de batismo (+ lista + modal no mesmo padrão do hub).
     */
    public function baptismHub(Request $request): Response
    {
        $churchId = $this->currentChurchId($request);
        $user = $request->user();

        if ($user === null) {
            return Inertia::render('Mobile/Solicitations/BaptismGuest', [
                'registerUrl' => route('register'),
                'redirectAfterLogin' => route('mobile.baptism', [], false),
                'redirectAfterLoginStudy' => route('mobile.solicitations.create', ['type' => 'bible_study'], false),
            ]);
        }

        $types = [
            ['type' => 'baptism', 'label' => self::typeLabel('baptism')],
        ];
        $hubUrl = route('mobile.baptism');

        $mySolicitations = ChurchSolicitation::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where('user_id', $user->id)
            ->whereNull('member_hidden_at')
            ->where('type', 'baptism')
            ->with(['assignedPastor:id,name', 'assignedVolunteer.user:id,name'])
            ->orderByDesc('updated_at')
            ->limit(40)
            ->get()
            ->map(function (ChurchSolicitation $s) use ($hubUrl, $churchId, $request) {
                $payload = self::memberConversationPayload(
                    $s,
                    route('mobile.solicitations.messages.store', $s),
                    $hubUrl,
                    $hubUrl,
                    null,
                    false,
                );

                return array_merge($payload, [
                    'memberUpdateUrl' => route('mobile.solicitations.update', $s),
                    'memberCanEditDetails' => $s->status === 'pending',
                    'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                    'memberPastoralBooking' => $s->type === 'pastor_visit' && $s->status === 'pending' && $churchId !== null
                        ? PastoralBookingInertiaProps::pastorPayload($request, null, (int) $s->id)
                        : null,
                ]);
            })
            ->values()
            ->all();

        return Inertia::render('Mobile/Solicitations/Hub', [
            'types' => $types,
            'mineUrl' => $hubUrl,
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'mySolicitations' => $mySolicitations,
            'pastoralBooking' => PastoralBookingInertiaProps::forRequest($request),
            'pastoralAgendaUrl' => route('mobile.pastoral-appointments.request', [], false),
            'pageTitle' => 'Pedido de batismo',
            'pageSubtitle' => 'Toque num pedido para editar ou conversar com a igreja.',
            'singleBaptismType' => true,
            'hideConversationReturnTo' => 'baptism_hub',
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
            'pastoralBooking' => $type === 'pastor_visit' ? PastoralBookingInertiaProps::forRequest($request) : null,
            'pastoralAgendaUrl' => route('mobile.pastoral-appointments.request', [], false),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = $this->currentChurchId($request);
        $effectiveChurchId = $churchId ?? (int) ($user->church_id ?? 0) ?: (int) (Church::query()->orderByDesc('active')->orderBy('name')->value('id') ?? 0);
        SolicitationAssignees::normalizeAssignmentRequest($request);

        $typeInput = (string) $request->input('type', '');
        $messageRules = $typeInput === 'pastor_visit'
            ? ['nullable', 'string', 'max:5000']
            : ['required', 'string', 'max:5000'];

        $rules = array_merge([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'message' => $messageRules,
            'meta' => ['nullable', 'array'],
        ], SolicitationAssignees::assignmentRules($churchId));

        if ($typeInput === 'pastor_visit') {
            $rules['preferred_start'] = ['required', 'string', 'max:64'];
            $rules['preferred_modality'] = ['nullable', 'string', Rule::in(['presential', 'online'])];
            if ($effectiveChurchId > 0) {
                $rules['assigned_pastor_id'] = ['required', 'integer', Rule::exists('pastors', 'id')->where('church_id', $effectiveChurchId)];
            } else {
                $rules['assigned_pastor_id'] = ['prohibited'];
            }
        }

        $valid = $request->validate($rules);

        SolicitationAssignees::assertSingleAssignee($valid);

        if (($valid['type'] ?? '') === 'leader_chat') {
            throw ValidationException::withMessages([
                'type' => 'Para falar com um líder de ministério, use «Falar com líder» em Mais.',
            ]);
        }

        $meta = $valid['meta'] ?? [];
        if (! is_array($meta)) {
            $meta = [];
        }

        $preferredDate = $valid['preferred_date'] ?? null;
        $pastorId = $valid['assigned_pastor_id'] ?? null;
        $volunteerId = $valid['assigned_volunteer_id'] ?? null;
        $message = trim((string) ($valid['message'] ?? ''));

        if (($valid['type'] ?? '') === 'pastor_visit') {
            if ($effectiveChurchId <= 0 || $pastorId === null) {
                throw ValidationException::withMessages([
                    'assigned_pastor_id' => 'Não foi possível identificar a igreja ou o pastor. Tente novamente.',
                ]);
            }
            $resolved = self::resolvePastoralVisitSlot(
                (int) $effectiveChurchId,
                (int) $pastorId,
                (string) $valid['preferred_start'],
                $valid['preferred_modality'] ?? null,
                null,
            );
            $meta['pastoral_visit'] = [
                'preferred_start' => $resolved['start']->toIso8601String(),
                'preferred_modality' => $resolved['modality'],
            ];
            $preferredDate = $resolved['start']->copy()->timezone((string) config('app.timezone'))->format('Y-m-d');
            $volunteerId = null;
            if ($message === '') {
                $message = 'Pedido de visita aos pastores (horário escolhido na app).';
            }
        }

        if ($message === '') {
            throw ValidationException::withMessages([
                'message' => 'Escreva uma mensagem.',
            ]);
        }

        $solicitation = ChurchSolicitation::create([
            'church_id' => $effectiveChurchId ?: null,
            'user_id' => $user->id,
            'type' => $valid['type'],
            'status' => 'pending',
            'message' => $message,
            'preferred_date' => $preferredDate,
            'assigned_pastor_id' => $pastorId !== null ? (int) $pastorId : null,
            'assigned_volunteer_id' => $volunteerId !== null ? (int) $volunteerId : null,
            'meta' => $meta !== [] ? $meta : null,
        ]);

        if ($effectiveChurchId) {
            app(SolicitationChatNotifier::class)->notifyChurchSolicitationsHandlerOfNewRequest(
                $solicitation,
                (int) $effectiveChurchId,
            );
        }

        $ref = (string) $request->headers->get('referer', '');
        if ($solicitation->type === 'baptism' && str_contains($ref, '/mobile/batismo')) {
            return redirect()->route('mobile.baptism', [
                'solicitacao' => $solicitation->id,
                'painel' => 'detalhes',
            ])->with('success', 'Pedido enviado.');
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
                    false,
                ),
                [
                    'memberUpdateUrl' => route('mobile.solicitations.update', $solicitation),
                    'memberCanEditDetails' => $solicitation->status === 'pending',
                    'memberPastorOptions' => SolicitationAssignees::pastorOptions($churchId),
                    'memberPastoralBooking' => $solicitation->type === 'pastor_visit' && $solicitation->status === 'pending' && $churchId !== null
                        ? PastoralBookingInertiaProps::pastorPayload($request, null, (int) $solicitation->id)
                        : null,
                    'pastoralAgendaUrl' => route('mobile.pastoral-appointments.request', [], false),
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
        bool $audienceIsAssignedLeader = false,
    ): array {
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

        $isLeaderChat = $s->type === 'leader_chat';
        $pvStart = data_get($s->meta, 'pastoral_visit.preferred_start');
        $pvMod = data_get($s->meta, 'pastoral_visit.preferred_modality');

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
                'preferredPastoralStart' => is_string($pvStart) ? $pvStart : null,
                'preferredPastoralModality' => is_string($pvMod) ? $pvMod : null,
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
            'memberHideConversationUrl' => $audienceIsAssignedLeader
                ? null
                : route('mobile.solicitations.hide-from-member', $s, false),
            'leaderHideConversationUrl' => ($audienceIsAssignedLeader && $isLeaderChat)
                ? route('mobile.leader-solicitations.hide-from-leader', $s, false)
                : null,
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

        if ($solicitation->type === 'pastor_visit') {
            SolicitationAssignees::normalizeAssignmentRequest($request);

            if (! $request->filled('preferred_start')) {
                $valid = $request->validate([
                    'message' => ['required', 'string', 'max:5000'],
                    'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact'])],
                ]);

                $solicitation->update([
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
            $cid = (int) ($solicitation->church_id ?? 0);
            if ($cid <= 0 && $churchId !== null) {
                $cid = (int) $churchId;
            }
            if ($cid <= 0) {
                throw ValidationException::withMessages([
                    'assigned_pastor_id' => 'Não foi possível identificar a igreja deste pedido.',
                ]);
            }

            $rules = array_merge([
                'message' => ['required', 'string', 'max:5000'],
                'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact'])],
                'preferred_start' => ['required', 'string', 'max:64'],
                'preferred_modality' => ['nullable', 'string', Rule::in(['presential', 'online'])],
                'assigned_pastor_id' => ['required', 'integer', Rule::exists('pastors', 'id')->where('church_id', $cid)],
            ], SolicitationAssignees::assignmentRules($cid));

            $valid = $request->validate($rules);

            SolicitationAssignees::assertSingleAssignee($valid);

            $resolved = self::resolvePastoralVisitSlot(
                $cid,
                (int) $valid['assigned_pastor_id'],
                (string) $valid['preferred_start'],
                $valid['preferred_modality'] ?? null,
                (int) $solicitation->id,
            );

            $meta = is_array($solicitation->meta) ? $solicitation->meta : [];
            $meta['pastoral_visit'] = [
                'preferred_start' => $resolved['start']->toIso8601String(),
                'preferred_modality' => $resolved['modality'],
            ];

            $solicitation->update([
                'message' => $valid['message'],
                'preferred_date' => $resolved['start']->copy()->timezone((string) config('app.timezone'))->format('Y-m-d'),
                'assigned_pastor_id' => (int) $valid['assigned_pastor_id'],
                'assigned_volunteer_id' => null,
                'meta' => $meta,
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

        if ($solicitation->type === self::TYPE_VOLUNTEER_REQUEST) {
            $valid = $request->validate([
                'message' => ['nullable', 'string', 'max:5000'],
                'return_to' => ['nullable', 'string', Rule::in(['hub'])],
            ]);
            $solicitation->update([
                'message' => trim((string) ($valid['message'] ?? '')),
            ]);

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

    public function hideFromMemberApp(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('hideFromMemberApp', $solicitation);

        $valid = $request->validate([
            'return_to' => ['nullable', 'string', Rule::in(['hub', 'leader_contact', 'baptism_hub'])],
        ]);

        $solicitation->update(['member_hidden_at' => now()]);

        $target = $valid['return_to'] ?? null;
        if ($target === 'baptism_hub') {
            return redirect()->route('mobile.baptism', ['lista' => '1'])
                ->with('success', 'A conversa foi removida da sua app. A igreja pode continuar a vê-la no atendimento.');
        }

        if ($target === 'leader_contact' || $solicitation->type === 'leader_chat') {
            return redirect()->route('mobile.contact', ['lista' => '1'])
                ->with('success', 'A conversa foi removida da sua app. A igreja pode continuar a vê-la no atendimento.');
        }

        return redirect()->route('mobile.solicitations.hub', ['lista' => '1'])
            ->with('success', 'A conversa foi removida da sua app. A igreja pode continuar a vê-la no atendimento.');
    }
}
