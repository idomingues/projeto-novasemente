<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Models\Pastor;
use App\Models\PastoralAvailability;
use App\Models\User;
use App\Services\SolicitationChatNotifier;
use App\Support\BaptismSolicitationStatus;
use App\Support\MemberPastoralAppointmentHubPayload;
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
    /** Tipos listados no hub (pedidos formais). «Falar com líder» é só em Mais → Contato; horário com pastor é o tipo sintético `pastoral`. */
    private const HUB_TYPES = ['baptism', 'bible_study', 'baby_presentation', 'other'];

    /** Tipos visíveis na lista do membro (inclui legados). */
    private const MEMBER_HUB_LIST_TYPES = ['baptism', 'bible_study', 'baby_presentation', 'pastor_visit', 'other'];

    private const TYPES = ['baptism', 'bible_study', 'baby_presentation', 'pastor_visit', 'other', 'leader_chat'];

    /** Criado só via fluxo dedicado (líder/admin), não pelo hub móvel de membros. */
    public const TYPE_VOLUNTEER_REQUEST = 'volunteer_request';

    public const TYPE_COMMUNICATION_REQUEST = 'communication_request';

    /** Registrado pela equipe (pastor/admin) quando o atendimento não passou pelo app. */
    public const TYPE_PASTORAL_INFORMAL = 'pastoral_informal';

    /** Tipos com painel próprio — não listar em Atendimento Pastoral (`solicitations.index`). */
    public const TYPES_OUTSIDE_PASTORAL_INDEX = [
        self::TYPE_VOLUNTEER_REQUEST,
        self::TYPE_COMMUNICATION_REQUEST,
        'leader_chat',
    ];

    /**
     * @return array{contactEmail: string, contactPhone: string}
     */
    private static function contactFormDefaults(?User $user): array
    {
        return [
            'contactEmail' => is_string($user?->email) ? (string) $user->email : '',
            'contactPhone' => is_string($user?->phone) ? (string) $user->phone : '',
        ];
    }

    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'baptism' => 'Batismo',
            'bible_study' => 'Estudo bíblico',
            'baby_presentation' => 'Apresentação de bebê',
            'pastor_visit' => 'Visita aos pastores',
            'leader_chat' => 'NS Conecta',
            'volunteer_request' => 'Pedido de voluntário',
            'communication_request' => 'Solicitação de comunicação',
            self::TYPE_PASTORAL_INFORMAL => 'Atendimento pastoral (informal)',
            'other' => 'Outros',
            default => $type,
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Pendente',
            'in_progress' => 'Pendente',
            'archived' => 'Arquivado',
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
            'in_progress' => 'Assunto aberto',
            'archived' => 'Arquivada',
            'completed' => 'Assunto finalizado',
            'cancelled' => 'Cancelada',
            default => self::statusLabel($status),
        };
    }

    private static function hubTypeDescription(string $type): string
    {
        return match ($type) {
            'pastoral' => 'Marcar conversa presencial ou online',
            'baptism' => 'Quero ser batizado',
            'baby_presentation' => 'Apresentar uma criança à igreja',
            'bible_study' => 'Quero estudar a Bíblia com alguém',
            'other' => 'Outro pedido à igreja',
            default => '',
        };
    }

    /**
     * @return list<array{type: string, label: string, description: string}>
     */
    private static function hubTypeItems(bool $includePastoral): array
    {
        $items = [];
        if ($includePastoral) {
            $items[] = [
                'type' => 'pastoral',
                'label' => 'Horário com pastor',
                'description' => self::hubTypeDescription('pastoral'),
            ];
        }

        foreach (self::HUB_TYPES as $t) {
            $items[] = [
                'type' => $t,
                'label' => self::typeLabel($t),
                'description' => self::hubTypeDescription($t),
            ];
        }

        return $items;
    }

    private static function pastoralHubDeepLink(): string
    {
        return route('mobile.solicitations.hub', ['novo' => 1, 'tipo' => 'pastoral'], false);
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

        $types = self::hubTypeItems(true);

        $hubUrl = route('mobile.solicitations.hub');
        $mySolicitations = [];
        $appointments = [];
        $pastoralBooking = null;
        if ($user) {
            $mySolicitations = ChurchSolicitation::query()
                ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
                ->where('user_id', $user->id)
                ->whereNull('member_hidden_at')
                ->whereIn('type', array_merge(self::MEMBER_HUB_LIST_TYPES, [self::TYPE_VOLUNTEER_REQUEST]))
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

            if ($churchId !== null) {
                $pastoralBooking = PastoralBookingInertiaProps::forRequest($request);
                $appointments = MemberPastoralAppointmentHubPayload::rowsForMember($request, (int) $churchId, (int) $user->id);
            }
        }

        return Inertia::render('Mobile/Solicitations/Hub', [
            'types' => $types,
            'mineUrl' => $hubUrl,
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'mySolicitations' => $mySolicitations,
            'appointments' => $appointments,
            'pastoralBooking' => $pastoralBooking,
            'pastoralAgendaUrl' => self::pastoralHubDeepLink(),
            ...self::contactFormDefaults($user),
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

        $types = self::hubTypeItems(false);
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

        // Home / atalho do app: sempre visão do membro (mesmo para admin).
        // Gestão da igreja fica só em baptism-requests.index (menu lateral).
        return Inertia::render('Mobile/Solicitations/Hub', [
            'types' => $types,
            'mineUrl' => $hubUrl,
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'mySolicitations' => $mySolicitations,
            'appointments' => [],
            'pastoralBooking' => null,
            'pastoralAgendaUrl' => self::pastoralHubDeepLink(),
            'pageTitle' => 'Pedido de batismo',
            'pageSubtitle' => 'Envie seu pedido e acompanhe a conversa com a igreja.',
            'singleBaptismType' => true,
            'hideConversationReturnTo' => 'baptism_hub',
            ...self::contactFormDefaults($user),
        ]);
    }

    public function create(Request $request, string $type): Response
    {
        abort_unless(in_array($type, self::HUB_TYPES, true), 404);

        $churchId = $this->currentChurchId($request);
        $user = $request->user();

        return Inertia::render('Mobile/Solicitations/Create', [
            'type' => $type,
            'typeLabel' => self::typeLabel($type),
            'storeUrl' => route('mobile.solicitations.store'),
            'pastorOptions' => SolicitationAssignees::pastorOptions($churchId),
            'volunteerOptions' => [],
            'pastoralAgendaUrl' => self::pastoralHubDeepLink(),
            ...self::contactFormDefaults($user),
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

        if ($typeInput === 'pastor_visit') {
            throw ValidationException::withMessages([
                'type' => 'Para marcar horário com pastor, use Solicitações e escolha «Horário com pastor».',
            ]);
        }

        $request->merge([
            'email' => strtolower(trim((string) $request->input('email', ''))),
            'phone' => trim((string) $request->input('phone', '')),
        ]);

        $rules = array_merge([
            'type' => ['required', 'in:'.implode(',', self::HUB_TYPES)],
            'message' => ['required', 'string', 'max:5000'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['required', 'string', 'max:50'],
            'meta' => ['nullable', 'array'],
            'return_to' => ['nullable', 'string', Rule::in(['baptism_admin'])],
        ], SolicitationAssignees::assignmentRules($churchId));

        $valid = $request->validate($rules, [
            'email.required' => 'Informe um e-mail de contato.',
            'email.email' => 'Informe um endereço de e-mail válido.',
            'email.unique' => 'Este e-mail já está cadastrado em outra conta.',
            'phone.required' => 'Informe um telefone de contato.',
        ]);

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
        $email = strtolower(trim((string) ($valid['email'] ?? '')));
        $phone = trim((string) ($valid['phone'] ?? ''));

        if ($message === '') {
            throw ValidationException::withMessages([
                'message' => 'Escreva uma mensagem.',
            ]);
        }

        if ($email === '' || $phone === '') {
            throw ValidationException::withMessages(array_filter([
                'email' => $email === '' ? 'Informe um e-mail de contato.' : null,
                'phone' => $phone === '' ? 'Informe um telefone de contato.' : null,
            ]));
        }

        $user->email = $email;
        $user->phone = $phone;
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }
        if ($user->isDirty('email') || $user->isDirty('phone')) {
            $user->save();
            $user->ensureVolunteerProfile();
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
        if ($solicitation->type === 'baptism') {
            if (($valid['return_to'] ?? '') === 'baptism_admin' || str_contains($ref, '/pedidos-batismo')) {
                return redirect()
                    ->route('baptism-requests.index', [
                        'aba' => 'pendente',
                        'modal_kind' => 'solicitation',
                        'modal_id' => (string) $solicitation->id,
                    ])
                    ->with('success', 'Pedido de batismo registrado.');
            }
            if (str_contains($ref, '/mobile/batismo')) {
                return redirect()->route('mobile.baptism', [
                    'solicitacao' => $solicitation->id,
                    'painel' => 'detalhes',
                ])->with('success', 'Pedido enviado.');
            }
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
                    'pastoralAgendaUrl' => self::pastoralHubDeepLink(),
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
                'statusLabel' => match (true) {
                    $isLeaderChat => self::leaderChatStatusLabel($s->status),
                    $s->type === 'baptism' => BaptismSolicitationStatus::label((string) $s->status),
                    default => self::statusLabel($s->status),
                },
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

        if ($solicitation->type === 'baptism') {
            return redirect()->route('mobile.baptism', [
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
            if ($solicitation->type === 'baptism') {
                return redirect()->route('mobile.baptism', [
                    'solicitacao' => $solicitation->id,
                    'painel' => 'chat',
                ]);
            }

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
