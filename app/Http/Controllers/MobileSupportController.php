<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
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

    public function index(Request $request): Response
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        $ticketsQuery = AppSupportTicket::query()->where('status', 'open');
        if (! $isAdmin) {
            $ticketsQuery->where('type', '!=', 'development');
        }
        if (! $isAdmin && $user) {
            $ticketsQuery->where('user_id', $user->id);
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

        return Inertia::render('Mobile/Support', [
            'tickets' => $tickets,
            'isAuthenticated' => (bool) $user,
            'hasMember' => (bool) ($user && $user->member_id),
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
            'member_id' => $user?->member_id ? (int) $user->member_id : null,
            'type' => $valid['type'],
            'message' => $valid['message'],
            'guest_name' => $valid['guest_name'] ?? null,
            'guest_email' => $valid['guest_email'] ?? null,
            'guest_phone' => $valid['guest_phone'] ?? null,
            'status' => 'open',
        ]);

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
        $canChat = (bool) $hasOwner && (bool) ($isAdmin || $isOwner) && $ticket->status === 'open';

        $messages = AppSupportMessage::query()
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
            'showMessages' => (bool) $hasOwner && (bool) ($isAdmin || $isOwner),
        ]);
    }

    public function sendMessage(Request $request, string $token): Response
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);

        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $isOwner = (int) $ticket->user_id === (int) $user->id;
        abort_unless($isAdmin || $isOwner, 403);
        abort_unless($ticket->status === 'open', 400);
        abort_unless(! empty($ticket->user_id), 400, 'Chat indisponível para chamados sem usuário logado.');

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        AppSupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_type' => $isAdmin ? 'admin' : 'user',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token]);
    }

    public function closeTicket(Request $request, string $token): Response
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($user);
        abort_unless($user, 401);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $isOwner = (int) $ticket->user_id === (int) $user->id;
        abort_unless($isAdmin || $isOwner, 403);
        abort_unless($ticket->status === 'open', 400);

        $valid = $request->validate([
            'solution_text' => ['nullable', 'string', 'max:5000'],
        ]);

        $solution = $valid['solution_text'] ?? null;
        if ($isAdmin) {
            abort_unless(is_string($solution) && trim($solution) !== '', 422, 'solution_text é obrigatório para encerrar como administrador.');
        }

        $ticket->update([
            'status' => 'closed',
            'closed_at' => now(),
            'solution_text' => $solution,
        ]);

        return redirect()->route('mobile.support.ticket', ['token' => $ticket->public_token]);
    }
}
