<?php

namespace App\Http\Controllers;

use App\Models\AppSupportMessage;
use App\Models\AppSupportTicket;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupportAdminController extends Controller
{
    private function isAdmin(User $user): bool
    {
        return $user->hasRole('admin') || $user->hasRole('super_admin');
    }

    private function canViewSupport(User $user): bool
    {
        return $user->hasAnyPermission(['support.view', 'support.manage']);
    }

    private function canManageSupport(User $user): bool
    {
        return $user->hasPermissionTo('support.manage');
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'problem' => 'Problema',
            'suggestion' => 'Sugestão',
            'praise' => 'Elogio',
            'development' => 'A desenvolver',
            default => 'Suporte',
        };
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->isAdmin($user), 403);

        $valid = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $ticket = AppSupportTicket::create([
            'public_token' => Str::uuid()->toString(),
            'user_id' => $user->id,
            'member_id' => $user->member_id ? (int) $user->member_id : null,
            'type' => 'development',
            'message' => $valid['message'],
            'guest_name' => null,
            'guest_email' => null,
            'guest_phone' => null,
            'status' => 'open',
        ]);

        return redirect()->route('support.index', ['modal' => $ticket->public_token]);
    }

    /**
     * @return array{ticket: array<string, mixed>, messages: array<int, array<string, mixed>>, supportUpdateUrl: string, supportDestroyUrl: string, supportCloseUrl: string, supportMessageStoreUrl: string, canManageTickets: bool}
     */
    private function ticketShowPayload(AppSupportTicket $ticket, User $user): array
    {
        $messages = AppSupportMessage::query()
            ->where('ticket_id', $ticket->id)
            ->with(['senderUser:id,name'])
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

        $publicToken = $ticket->public_token;

        return [
            'ticket' => [
                'publicToken' => $publicToken,
                'type' => $ticket->type,
                'typeLabel' => $this->typeLabel($ticket->type),
                'isGuest' => ! (bool) $ticket->user_id,
                'status' => $ticket->status,
                'message' => $ticket->message,
                'solutionText' => $ticket->solution_text,
                'createdAt' => $ticket->created_at?->toIso8601String(),
                'closedAt' => $ticket->closed_at?->toIso8601String(),
                'ownerLabel' => $ticket->user_id ? ($ticket->user?->name ?? 'Usuário') : ($ticket->guest_name ?? 'Convidado'),
            ],
            'messages' => $messages,
            'supportUpdateUrl' => route('support.update', ['token' => $publicToken]),
            'supportDestroyUrl' => route('support.destroy', ['token' => $publicToken]),
            'supportCloseUrl' => route('support.close', ['token' => $publicToken]),
            'supportMessageStoreUrl' => route('support.messages.store', ['token' => $publicToken]),
            'canManageTickets' => $this->canManageSupport($user),
        ];
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canViewSupport($user), 403);

        $tickets = AppSupportTicket::query()
            ->with('user:id,name')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (AppSupportTicket $t) => [
                'publicToken' => $t->public_token,
                'type' => $t->type,
                'typeLabel' => $this->typeLabel($t->type),
                'status' => $t->status,
                'message' => $t->message,
                'solutionText' => $t->solution_text,
                'createdAt' => $t->created_at?->toIso8601String(),
                'updatedAt' => $t->updated_at?->toIso8601String(),
                'ownerLabel' => $t->user_id
                    ? ($t->user?->name ?? 'Usuário')
                    : ($t->guest_name ?? 'Convidado'),
            ])
            ->values()
            ->all();

        $modalDetail = null;
        $modalToken = $request->query('modal');
        if (is_string($modalToken) && $modalToken !== '') {
            $modalTicket = AppSupportTicket::query()->where('public_token', $modalToken)->first();
            if ($modalTicket) {
                $modalDetail = $this->ticketShowPayload($modalTicket, $user);
            }
        }

        return Inertia::render('Support/Index', [
            'tickets' => $tickets,
            'devItemStoreUrl' => route('support.store'),
            'supportIndexUrl' => route('support.index'),
            'modalDetail' => $modalDetail,
            'canCreateDevItem' => $this->isAdmin($user),
        ]);
    }

    public function show(Request $request, string $token): Response
    {
        $user = $request->user();
        abort_unless($user && $this->canViewSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();

        return Inertia::render('Support/Show', $this->ticketShowPayload($ticket, $user));
    }

    public function update(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();

        $valid = $request->validate([
            'message' => ['sometimes', 'required', 'string', 'max:5000'],
            'status' => ['sometimes', 'in:open'],
        ]);

        if (array_key_exists('message', $valid)) {
            $ticket->message = $valid['message'];
        }

        if (($valid['status'] ?? null) === 'open') {
            $ticket->status = 'open';
            $ticket->closed_at = null;
            $ticket->solution_text = null;
        }

        $ticket->save();

        return redirect()->route('support.index', ['modal' => $token]);
    }

    public function destroy(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        $ticket->delete();

        return redirect()->route('support.index');
    }

    public function sendMessage(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless($ticket->status === 'open', 400);
        abort_unless(! empty($ticket->user_id), 400, 'Chat indisponível para chamados sem usuário logado.');

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        AppSupportMessage::create([
            'ticket_id' => $ticket->id,
            'sender_type' => 'admin',
            'sender_user_id' => $user->id,
            'content' => $valid['content'],
        ]);

        return redirect()->back(fallback: route('support.show', ['token' => $token]));
    }

    public function closeTicket(Request $request, string $token): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user && $this->canManageSupport($user), 403);

        $ticket = AppSupportTicket::query()->where('public_token', $token)->firstOrFail();
        abort_unless($ticket->status === 'open', 400);

        $valid = $request->validate([
            'solution_text' => ['required', 'string', 'max:5000'],
        ]);

        $ticket->update([
            'status' => 'closed',
            'closed_at' => now(),
            'solution_text' => $valid['solution_text'],
        ]);

        return redirect()->back(fallback: route('support.show', ['token' => $token]));
    }
}
