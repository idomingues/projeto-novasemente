<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use App\Services\SupportTicketChatNotifier;
use Illuminate\Http\JsonResponse;
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
            $ticketsQuery = AppSupportTicket::query()->where('status', 'open');
            if (! $isAdmin) {
                $ticketsQuery->where('type', '!=', 'development')->where('user_id', $user->id);
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

            'guest_name' => ['nullable', 'string', 'max:255'],
            'guest_email' => ['nullable', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $user?->id,
            'type' => $valid['type'],
            'message' => $valid['message'],
            'guest_name' => $valid['guest_name'] ?? null,
            'guest_email' => $valid['guest_email'] ?? null,
            'guest_phone' => $valid['guest_phone'] ?? null,
            'status' => 'open',
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
        $hasOwner = ! empty($ticket->user_id);
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        $canAccess = $isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff;
        abort_unless($canAccess, 403);

        $canChat = (bool) $hasOwner
            && $ticket->status === 'open'
            && ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);

        $messages = $this->ticketMessagesPayload($ticket);

        return Inertia::render('Mobile/SupportTicket', [
            'ticket' => [
                'publicToken' => $ticket->public_token,
                'type' => $ticket->type,
                'typeLabel' => $this->typeLabel($ticket->type),
                'status' => $ticket->status,
                'message' => $ticket->message,
                'solutionText' => $ticket->solution_text,
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
            ],
            'messages' => $messages,
            'canChat' => $canChat,
            'isAdmin' => $isAdmin,
            'isAuthenticated' => (bool) $user,
            'showMessages' => (bool) $hasOwner && (bool) ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff),
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
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        $canAccess = $isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff;
        abort_unless($canAccess, 403);

        $hasOwner = ! empty($ticket->user_id);
        $canChat = (bool) $hasOwner
            && $ticket->status === 'open'
            && ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);
        $showMessages = (bool) $hasOwner && (bool) ($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff);

        return response()->json([
            'ticket' => [
                'publicToken' => $ticket->public_token,
                'type' => $ticket->type,
                'typeLabel' => $this->typeLabel($ticket->type),
                'status' => $ticket->status,
                'message' => $ticket->message,
                'solutionText' => $ticket->solution_text,
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
                'pastoralAppointmentId' => $ticket->pastoral_appointment_id,
            ],
            'messages' => $this->ticketMessagesPayload($ticket),
            'canChat' => $canChat,
            'showMessages' => $showMessages,
            'isAdmin' => $isAdmin,
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
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        abort_unless($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff, 403);
        abort_unless($ticket->status === 'open', 400);
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
            $notifier->notifyOwnerOfStaffMessage($ticket, $user);
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
        $isSupportStaff = $this->canReplyAsSupportStaff($user);
        $isPastoralStaff = $this->canReplyAsPastoralStaff($user, $ticket);
        abort_unless($isAdmin || $isOwner || $isSupportStaff || $isPastoralStaff, 403);
        abort_unless($ticket->status === 'open', 400);

        $valid = $request->validate([
            'solution_text' => ['nullable', 'string', 'max:5000'],
        ]);

        $solution = $valid['solution_text'] ?? null;
        $staffActor = $isAdmin || $isSupportStaff || $isPastoralStaff;
        if ($staffActor && ! $isOwner) {
            abort_unless(is_string($solution) && trim($solution) !== '', 422, 'Indique um resumo ao encerrar o chamado.');
        }

        $ticket->update([
            'status' => 'closed',
            'closed_at' => now(),
            'solution_text' => $solution,
        ]);

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token]);
    }
}
