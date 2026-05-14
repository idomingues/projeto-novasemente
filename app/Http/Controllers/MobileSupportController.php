<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Services\SupportTicketChatNotifier;
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
            AppSupportTicket::STATUS_OPEN => 'Aberto',
            AppSupportTicket::STATUS_IN_PROGRESS => 'Em andamento',
            AppSupportTicket::STATUS_WAITING_USER => 'Aguardando usuário',
            AppSupportTicket::STATUS_RESOLVED => 'Resolvido',
            AppSupportTicket::STATUS_CLOSED => 'Fechado',
            default => 'Aberto',
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
        $isAdmin = $this->isAdmin($user);

        $tickets = [];
        if ($user) {
            $ticketsQuery = AppSupportTicket::query()->whereIn('status', AppSupportTicket::activeStatuses());
            if (! $isAdmin) {
                $ticketsQuery->where('type', '!=', 'development')
                    ->where('user_id', $user->id)
                    ->whereNull('user_hidden_at');
            } else {
                $ticketsQuery->where('type', '!=', 'development');
            }

            $tickets = $ticketsQuery
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
                    'createdAt' => $t->created_at?->toIso8601String(),
                    'solutionText' => $t->solution_text,
                ])
                ->values()
                ->all();
        }

        return Inertia::render('Mobile/Support', [
            'tickets' => $tickets,
            'isAuthenticated' => (bool) $user,
        ]);
    }

    public function store(Request $request): Response
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

        $screenshotPath = null;
        if ($request->hasFile('screenshot_file')) {
            $screenshotPath = $request->file('screenshot_file')?->store('support/screenshots', 'public');
        }

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $user?->id,
            'type' => $valid['type'],
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

        app(SupportTicketChatNotifier::class)->notifyStaffOfNewTicket($ticket, $user);

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token], absolute: true);
    }

    public function ticket(Request $request, string $token): Response
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();

        if ($ticket->type === 'development' && ! $isAdmin) {
            abort(403);
        }

        $isOwner = $user && $ticket->user_id && (int) $ticket->user_id === (int) $user->id;
        if ($isOwner && $ticket->user_hidden_at) {
            abort(403);
        }
        $hasOwner = ! empty($ticket->user_id);
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        $canAccess = $isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff;
        abort_unless($canAccess, 403);

        $canChat = (bool) $hasOwner
            && AppSupportTicket::isActiveStatus((string) $ticket->status)
            && ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);

        $messages = $this->ticketMessagesPayload($ticket);

        return Inertia::render('Mobile/SupportTicket', [
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
            ],
            'messages' => $messages,
            'canChat' => $canChat,
            'isAdmin' => $isAdmin,
            'isAuthenticated' => (bool) $user,
            'showMessages' => (bool) $hasOwner && (bool) ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff),
            'hideFromMyAppUrl' => ($isOwner && ! $isAdmin)
                ? route('mobile.support.ticket.hide', ['token' => $ticket->public_token], false)
                : null,
        ]);
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
        $canChat = (bool) $hasOwner
            && AppSupportTicket::isActiveStatus((string) $ticket->status)
            && ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);
        $showMessages = (bool) $hasOwner && (bool) ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);

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

    public function sendMessage(Request $request, string $token): Response
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
        abort_unless(! empty($ticket->user_id), 400, 'Chat indisponível para chamados sem usuário logado.');

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'return_to' => ['nullable', 'string', Rule::in(['pastoral_hub'])],
        ]);

        $senderStaff = $isAdmin || $isSupportStaff || $isPastoralStaff;

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

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token]);
    }

    public function closeTicket(Request $request, string $token): Response
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

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token]);
    }

    public function hideFromUser(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless($ticket->user_id && (int) $ticket->user_id === (int) $user->id, 403);

        $ticket->update(['user_hidden_at' => now()]);

        return redirect()->route('mobile.support.index')
            ->with('success', 'O chamado foi removido da sua lista. A equipa de suporte mantém o registo.');
    }
}
