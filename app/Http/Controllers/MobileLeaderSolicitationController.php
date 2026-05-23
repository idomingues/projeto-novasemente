<?php

namespace App\Http\Controllers;

use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Services\SolicitationChatNotifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileLeaderSolicitationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = \App\Models\Church::resolveWorkingId($request);

        $rows = ChurchSolicitation::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->where('type', 'leader_chat')
            ->whereNull('leader_hidden_at')
            ->whereHas('assignedVolunteer', fn ($q) => $q->where('user_id', $user->id))
            ->with('user:id,name')
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (ChurchSolicitation $s) => [
                'id' => $s->id,
                'typeLabel' => MobileChurchSolicitationController::typeLabel($s->type),
                'status' => $s->status,
                'statusLabel' => MobileChurchSolicitationController::leaderChatStatusLabel($s->status),
                'subject' => $s->subject,
                'memberLabel' => $s->user?->name ?? 'Membro',
                'messageExcerpt' => mb_strimwidth(strip_tags($s->message), 0, 100, '…'),
                'updatedAt' => $s->updated_at?->toIso8601String(),
                'showUrl' => route('mobile.leader-solicitations.show', $s),
            ])
            ->values()
            ->all();

        return Inertia::render('Mobile/Solicitations/LeaderInbox', [
            'conversations' => $rows,
            'moreUrl' => route('mobile.more'),
        ]);
    }

    public function show(Request $request, ChurchSolicitation $solicitation): Response
    {
        $this->authorize('view', $solicitation);

        return Inertia::render('Mobile/Solicitations/LeaderShow', MobileChurchSolicitationController::memberConversationPayload(
            $solicitation,
            route('mobile.leader-solicitations.messages.store', $solicitation),
            route('mobile.leader-solicitations.index'),
            route('mobile.more'),
            route('mobile.leader-solicitations.finalize', $solicitation),
            true,
        ));
    }

    public function sendMessage(Request $request, ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('sendMessageAsStaff', $solicitation);

        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        ChurchSolicitationMessage::create([
            'church_solicitation_id' => $solicitation->id,
            'sender_type' => 'staff',
            'sender_user_id' => $request->user()->id,
            'content' => $valid['content'],
        ]);

        $solicitation->touch();

        app(SolicitationChatNotifier::class)->notifyMemberOfStaffMessage($solicitation, $request->user(), $valid['content']);

        $actor = $request->user();
        if ($actor && (int) $solicitation->user_id === (int) $actor->id) {
            $request->session()->flash(
                'success',
                'Mensagem registada. Tem uma notificação nova na caixa de entrada (ícone do sino).',
            );
        }

        return redirect()->route('mobile.leader-solicitations.show', $solicitation);
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

        return redirect()->route('mobile.leader-solicitations.index')->with('success', 'Assunto finalizado. A conversa ficou encerrada para si e para o membro.');
    }

    public function hideFromLeaderApp(ChurchSolicitation $solicitation): RedirectResponse
    {
        $this->authorize('hideFromLeaderApp', $solicitation);

        $solicitation->update(['leader_hidden_at' => now()]);

        return redirect()->route('mobile.leader-solicitations.index')
            ->with('success', 'A conversa foi removida da sua app. O membro e a igreja podem continuar a vê-la no atendimento.');
    }
}
