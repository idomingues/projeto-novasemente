<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Services\SupportTicketChatNotifier;
use App\Support\AppSupportTicketOptions;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MobileSupportController extends Controller
{
    private const GUEST_TICKET_TOKENS_SESSION_KEY = 'mobile_support_guest_tokens';

    /** Janela para reaproveitar envio idêntico (evita triplicar por reenvio do visitante). */
    private const DUPLICATE_SUBMIT_WINDOW_MINUTES = 10;

    private function typeLabel(string $type): string
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

    private function statusLabel(string $status): string
    {
        return match ($status) {
            AppSupportTicket::STATUS_OPEN => 'Pendente',
            AppSupportTicket::STATUS_IN_PROGRESS => 'Em andamento',
            AppSupportTicket::STATUS_WAITING_USER => 'Aguardando usuário',
            AppSupportTicket::STATUS_RESOLVED => 'Resolvido',
            AppSupportTicket::STATUS_CLOSED => 'Fechado',
            default => 'Pendente',
        };
    }

    private function isAdmin(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $user->hasRole('admin') || $user->hasRole('super_admin');
    }

    private function canReplyAsSupportStaff(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        return $this->isAdmin($user) || $user->can('support.manage');
    }

    private function canReplyAsPastoralStaff(?User $user, AppSupportTicket $ticket): bool
    {
        if (! $user || $ticket->type !== 'pastoral' || ! $ticket->pastoral_appointment_id) {
            return false;
        }

        return $user->can('pastoral_appointments.manage');
    }

    public function index(Request $request): Response
    {
        $user = $request->user();

        $tickets = $this->listTicketsPayload($request, $user);

        $modalDetail = null;
        $modalToken = $request->query('modal');
        if (is_string($modalToken) && $modalToken !== '') {
            $modalDetail = $this->ticketPagePayloadForModal($request, $modalToken);
            // Visitante que abriu o chamado por link/modal passa a vê-lo em «Chamados».
            if ($modalDetail && ! $user && is_string($modalDetail['ticket']['publicToken'] ?? null)) {
                $this->rememberGuestTicketToken($request, (string) $modalDetail['ticket']['publicToken']);
                $tickets = $this->listTicketsPayload($request, $user);
            }
        }

        return Inertia::render('Mobile/Support', [
            'tickets' => $tickets,
            'isAuthenticated' => (bool) $user,
            'userName' => $user?->name,
            'supportIndexUrl' => route('mobile.support.index', [], false),
            'modalDetail' => $modalDetail,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        $valid = $request->validate([
            'type' => ['required', 'in:problem,suggestion,praise'],
            'message' => ['required', 'string', 'max:5000'],
            'screenshot_file' => ['nullable', 'image', 'max:5120'],
            'screenshot_url' => ['nullable', 'url', 'max:2048'],

            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $existing = $this->findRecentDuplicateTicket($request, $user, $valid);
        if ($existing) {
            if (! $user) {
                $this->rememberGuestTicketToken($request, (string) $existing->public_token);
            }

            return redirect()->route('mobile.support.index', ['modal' => $existing->public_token]);
        }

        $screenshotPath = null;
        if ($request->hasFile('screenshot_file')) {
            $screenshotPath = $request->file('screenshot_file')?->store('support/screenshots', 'public');
        }

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $user?->id,
            'type' => $valid['type'],
            'demand_category' => AppSupportTicketOptions::DEMAND_CATEGORY_CLIENT,
            'priority' => AppSupportTicket::PRIORITY_MEDIUM,
            'message' => $valid['message'],
            'screenshot_path' => $screenshotPath,
            'screenshot_url' => isset($valid['screenshot_url']) && trim((string) $valid['screenshot_url']) !== ''
                ? trim((string) $valid['screenshot_url'])
                : null,
            'guest_name' => $valid['guest_name'] ?? null,
            'guest_email' => $valid['guest_email'] ?? null,
            'guest_phone' => $valid['guest_phone'] ?? null,
            'status' => AppSupportTicket::STATUS_OPEN,
        ]);

        if (! $user) {
            $this->rememberGuestTicketToken($request, (string) $ticket->public_token);
        }

        app(SupportTicketChatNotifier::class)->notifyStaffOfNewTicket($ticket, $user);

        return redirect()->route('mobile.support.index', ['modal' => $ticket->public_token]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listTicketsPayload(Request $request, ?User $user): array
    {
        $ticketsQuery = AppSupportTicket::query()
            ->whereIn('status', AppSupportTicket::activeStatuses())
            ->where('type', '!=', 'development');

        if ($user) {
            // «Os meus chamados»: só os do usuário (admin gerencia o restante em /support).
            $ticketsQuery->where('user_id', $user->id)->whereNull('user_hidden_at');
        } else {
            $tokens = $this->guestTicketTokensFromSession($request);
            if ($tokens === []) {
                return [];
            }
            $ticketsQuery->whereNull('user_id')->whereIn('public_token', $tokens);
        }

        return $ticketsQuery
            ->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (AppSupportTicket $t) => [
                'publicToken' => $t->public_token,
                'type' => $t->type,
                'typeLabel' => $this->typeLabel($t->type),
                'status' => $t->status,
                'statusLabel' => $this->statusLabel((string) $t->status),
                'message' => $t->message,
                'forecastAt' => $t->forecast_at?->toDateString(),
                'createdAt' => $t->created_at?->toIso8601String(),
                'solutionText' => $t->solution_text,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array{type: string, message: string, guest_email?: string|null, guest_phone?: string|null}  $valid
     */
    private function findRecentDuplicateTicket(Request $request, ?User $user, array $valid): ?AppSupportTicket
    {
        $query = AppSupportTicket::query()
            ->where('type', $valid['type'])
            ->where('message', $valid['message'])
            ->whereIn('status', AppSupportTicket::activeStatuses())
            ->where('created_at', '>=', now()->subMinutes(self::DUPLICATE_SUBMIT_WINDOW_MINUTES));

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $email = trim((string) ($valid['guest_email'] ?? ''));
            $phone = trim((string) ($valid['guest_phone'] ?? ''));
            $sessionTokens = $this->guestTicketTokensFromSession($request);

            $query->whereNull('user_id')->where(function ($q) use ($email, $phone, $sessionTokens) {
                $matched = false;
                if ($email !== '') {
                    $q->orWhere('guest_email', $email);
                    $matched = true;
                }
                if ($phone !== '') {
                    $q->orWhere('guest_phone', $phone);
                    $matched = true;
                }
                if ($sessionTokens !== []) {
                    $q->orWhereIn('public_token', $sessionTokens);
                    $matched = true;
                }
                if (! $matched) {
                    $q->whereRaw('0 = 1');
                }
            });
        }

        return $query->orderByDesc('id')->first();
    }

    /**
     * @return list<string>
     */
    private function guestTicketTokensFromSession(Request $request): array
    {
        $tokens = $request->session()->get(self::GUEST_TICKET_TOKENS_SESSION_KEY, []);
        if (! is_array($tokens)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            $tokens,
            static fn ($t) => is_string($t) && $t !== '',
        )));
    }

    private function rememberGuestTicketToken(Request $request, string $token): void
    {
        $tokens = $this->guestTicketTokensFromSession($request);
        $tokens[] = $token;
        $tokens = array_values(array_unique($tokens));
        $request->session()->put(
            self::GUEST_TICKET_TOKENS_SESSION_KEY,
            array_slice($tokens, -20),
        );
    }

    public function ticket(Request $request, string $token): RedirectResponse
    {
        $ticket = AppSupportTicket::query()->where('public_token', $token)->first();

        if (! $ticket) {
            return redirect()->route('mobile.support.index');
        }

        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        if ($ticket->type === 'development' && ! $isAdmin) {
            abort(403);
        }

        $isOwner = $user && $ticket->user_id && (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            abort(403);
        }

        $isGuestTicket = empty($ticket->user_id);
        if (! $isGuestTicket) {
            abort_unless($user, 403);

            $isSupportStaff = $this->canReplyAsSupportStaff($user);
            $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
            abort_unless($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff, 403);
        }

        return redirect()->route('mobile.support.index', ['modal' => $token]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function ticketPagePayloadForModal(Request $request, string $token): ?array
    {
        $ticket = AppSupportTicket::query()->where('public_token', $token)->first();
        if (! $ticket) {
            return null;
        }

        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        if ($ticket->type === 'development' && ! $isAdmin) {
            return null;
        }

        $isOwner = $user && $ticket->user_id && (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            return null;
        }

        $isGuestTicket = empty($ticket->user_id);
        $hasOwner = ! empty($ticket->user_id);
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        $canAccess = $isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff || $isGuestTicket;
        if (! $canAccess) {
            return null;
        }

        return $this->buildTicketPageProps(
            $request,
            $ticket,
            $user,
            $isAdmin,
            (bool) $isOwner,
            $isGuestTicket,
            $hasOwner,
            $isSupportStaff,
            $isPastoralStaff,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildTicketPageProps(
        Request $request,
        AppSupportTicket $ticket,
        ?User $user,
        bool $isAdmin,
        bool $isOwner,
        bool $isGuestTicket,
        bool $hasOwner,
        bool $isSupportStaff,
        bool $isPastoralStaff,
    ): array {
        $isStaff = $isAdmin || $isSupportStaff || $isPastoralStaff;
        $isActive = AppSupportTicket::isActiveStatus((string) $ticket->status);

        // Equipe responde mesmo em chamado de visitante (sem user_id); o dono só conversa se tiver conta.
        $canChat = $isActive && (
            $isStaff
            || ((bool) $hasOwner && $isOwner)
        );

        $staffReplySendsOwnerEmail = $canChat && $isStaff && (
            (bool) $hasOwner
            || (is_string($ticket->guest_email) && trim((string) $ticket->guest_email) !== '')
        );

        $showMessages = $isStaff
            || ((bool) $hasOwner && $isOwner)
            || $isGuestTicket;

        return [
            'ticket' => [
                'publicToken' => $ticket->public_token,
                'type' => $ticket->type,
                'typeLabel' => $this->typeLabel($ticket->type),
                'status' => $ticket->status,
                'statusLabel' => $this->statusLabel((string) $ticket->status),
                'message' => $ticket->message,
                'screenshotUrl' => $ticket->screenshot_path ? StorageUrl::publicMediaUrl($ticket->screenshot_path) : null,
                'screenshotExternalUrl' => $ticket->screenshot_url,
                'solutionText' => $ticket->solution_text,
                'forecastAt' => $ticket->forecast_at?->toDateString(),
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
            ],
            'messages' => $this->ticketMessagesPayload($ticket),
            'canChat' => $canChat,
            'isAdmin' => $isAdmin,
            'staffReplySendsOwnerEmail' => $staffReplySendsOwnerEmail,
            'isAuthenticated' => (bool) $user,
            'showMessages' => $showMessages,
            'isGuestTicket' => $isGuestTicket,
            'guestName' => $ticket->guest_name,
            'hideFromMyAppUrl' => ($isOwner && ! $isAdmin)
                ? route('mobile.support.ticket.hide', ['token' => $ticket->public_token], false)
                : null,
        ];
    }

    /**
     * Mensagens do ticket (JSON) para painéis embutidos (ex.: modal no hub de agendamentos pastor).
     */
    public function ticketMessages(Request $request, string $token): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $isAdmin = $this->isAdmin($user);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();

        if ($ticket->type === 'development' && ! $isAdmin) {
            abort(403);
        }

        $isOwner = $ticket->user_id && (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            abort(403);
        }
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        $canAccess = $isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff;
        abort_unless($canAccess, 403);

        $hasOwner = ! empty($ticket->user_id);
        $isStaff = $isAdmin || $isSupportStaff || $isPastoralStaff;
        $isActive = AppSupportTicket::isActiveStatus((string) $ticket->status);
        $canChat = $isActive && (
            $isStaff
            || ((bool) $hasOwner && $isOwner)
        );
        $showMessages = $isStaff
            || ((bool) $hasOwner && $isOwner)
            || empty($ticket->user_id);

        return response()->json([
            'ticket' => [
                'publicToken' => $ticket->public_token,
                'type' => $ticket->type,
                'typeLabel' => $this->typeLabel($ticket->type),
                'status' => $ticket->status,
                'statusLabel' => $this->statusLabel((string) $ticket->status),
                'message' => $ticket->message,
                'screenshotUrl' => $ticket->screenshot_path ? StorageUrl::publicMediaUrl($ticket->screenshot_path) : null,
                'screenshotExternalUrl' => $ticket->screenshot_url,
                'solutionText' => $ticket->solution_text,
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
                'pastoralAppointmentId' => $ticket->pastoral_appointment_id,
            ],
            'messages' => $this->ticketMessagesPayload($ticket),
            'canChat' => $canChat,
            'showMessages' => $showMessages,
            'isAdmin' => $isAdmin,
            'hideFromMyAppUrl' => ($isOwner && ! $isAdmin)
                ? route('mobile.support.ticket.hide', ['token' => $ticket->public_token], false)
                : null,
        ]);
    }

    /**
     * @return list<array{id: int, senderType: string, senderUserId: int|null, senderName: string|null, content: string, createdAt: string|null}>
     */
    private function ticketMessagesPayload(AppSupportTicket $ticket): array
    {
        return AppSupportMessage::query()
            ->where('ticket_id', $ticket->id)
            ->with('senderUser:id,name,email')
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

    public function sendMessage(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $isOwner = (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            abort(403);
        }
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        abort_unless($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff, 403);
        abort_unless(AppSupportTicket::isActiveStatus((string) $ticket->status), 400);

        $senderStaff = $isAdmin || $isSupportStaff || $isPastoralStaff;
        // Visitante sem conta: só a equipe responde (histórico + e-mail do guest, se houver).
        if (empty($ticket->user_id)) {
            abort_unless($senderStaff, 400, 'Chat indisponível para chamados sem usuário logado.');
        }

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'return_to' => ['nullable', 'string', Rule::in(['pastoral_hub'])],
        ]);

        AppSupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_type' => $senderStaff ? 'admin' : 'user',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        $notifier = app(SupportTicketChatNotifier::class);
        if ($senderStaff) {
            $notifier->notifyOwnerOfStaffMessage($ticket, $user, $valid['content']);
            if ($ticket->user_id && (int) $ticket->user_id === (int) $user->id) {
                $request->session()->flash(
                    'success',
                    'Mensagem registada. Tem uma notificação nova na caixa de entrada (ícone do sino).',
                );
            }
        } else {
            $notifier->notifyStaffOfUserMessage($ticket, $user);
        }

        $returnTo = $valid['return_to'] ?? null;
        if ($returnTo === 'pastoral_hub' && $ticket->pastoral_appointment_id) {
            return redirect()->route('mobile.pastoral-appointments.request', [
                'appointment' => $ticket->pastoral_appointment_id,
                'painel' => 'chat',
            ]);
        }

        return redirect()->route('mobile.support.index', ['modal' => $ticket->public_token]);
    }

    public function closeTicket(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);
        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $isOwner = (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            abort(403);
        }
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        abort_unless($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff, 403);
        abort_unless(AppSupportTicket::isActiveStatus((string) $ticket->status), 400);

        $valid = $request->validate([
            'solution_text' => ['nullable', 'string', 'max:5000'],
        ]);

        $solution = $valid['solution_text'] ?? null;
        $staffActor = $isAdmin || $isSupportStaff || $isPastoralStaff;
        if ($staffActor && ! $isOwner) {
            abort_unless(is_string($solution) && trim($solution) !== '', 422, 'Indique um resumo ao encerrar o chamado.');
        }

        $ticket->update([
            'status' => AppSupportTicket::STATUS_CLOSED,
            'closed_at' => now(),
            'solution_text' => $solution,
        ]);

        if ($staffActor && ! $isOwner) {
            app(SupportTicketChatNotifier::class)->notifyOwnerOfTicketUpdate(
                $ticket->fresh(),
                $user,
                true,
                is_string($solution) && trim($solution) !== '',
            );
        }

        return redirect()->route('mobile.support.index', ['modal' => $ticket->public_token]);
    }

    public function hideFromUser(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless($ticket->user_id && (int) $ticket->user_id === (int) $user->id, 403);

        $ticket->update(['user_hidden_at' => now()]);

        return redirect()->route('mobile.support.index')
            ->with('success', 'O chamado foi removido da sua lista. A equipe de suporte mantém o registro.');
    }
}
