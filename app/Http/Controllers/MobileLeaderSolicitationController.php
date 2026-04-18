<?php

namespace App\Http\Controllers;

use App\Models\ChurchSolicitation;
use App\Models\ChurchSolicitationMessage;
use App\Services\SolicitationChatNotifier;
use App\Support\InboxNotificationResolver;
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

        $rows = ChurchSolicitation::query()
            ->where('type', 'leader_chat')
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
        InboxNotificationResolver::markReadFromQuery($request);

        return Inertia::render('Mobile/Solicitations/LeaderShow', MobileChurchSolicitationController::memberConversationPayload(
            $solicitation,
            route('mobile.leader-solicitations.messages.store', $solicitation),
            route('mobile.leader-solicitations.index'),
            route('mobile.more'),
            route('mobile.leader-solicitations.finalize', $solicitation),
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

        if (in_array($solicitation->status, ['pending'], true)) {
            $solicitation->update(['status' => 'in_progress']);
        } else {
            $solicitation->touch();
        }

        app(SolicitationChatNotifier::class)->notifyMemberOfStaffMessage($solicitation, $request->user(), $valid['content']);

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
}
