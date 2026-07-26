<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ClaimConversation;
use App\Actions\Conversations\ForwardConversation;
use App\Actions\Conversations\MarkConversationRead;
use App\Actions\Conversations\SendConversationMessage;
use App\Actions\Conversations\TransferConversation;
use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationMessage;
use App\Models\Ministry;
use App\Models\User;
use App\Support\ConversationPresenter;
use App\Support\NsWhatsAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileNsWhatsLeaderController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 401);

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $isAdmin = NsWhatsAccess::isModuleAdmin($user);
        $isLeaderStaff = $user->can('viewAny', ChurchConversation::class);
        $hasAssigned = ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where('assignee_user_id', $user->id)
            ->exists();
        abort_unless($isLeaderStaff || $hasAssigned, 403);

        $ministryIds = $user->ministries()->where('church_id', $churchId)->pluck('ministries.id')->map(fn ($id) => (int) $id)->all();

        $filter = (string) $request->query('filter', $isLeaderStaff ? 'all' : 'mine');
        $query = ChurchConversation::query()->where('church_id', $churchId);

        if ($isAdmin) {
            // sem restrição de departamento
        } elseif ($isLeaderStaff) {
            abort_if($ministryIds === [], 403);
            $query->whereIn('current_ministry_id', $ministryIds);
        } else {
            // Membro do departamento com conversas atribuídas (não é líder)
            $query->where('assignee_user_id', $user->id);
            $filter = 'mine';
        }

        match ($filter) {
            'new' => $query->where('status', ChurchConversation::STATUS_NEW),
            'unclaimed' => $query->whereNull('assignee_user_id'),
            'mine' => $query->where('assignee_user_id', $user->id),
            'awaiting_member' => $query->where('status', ChurchConversation::STATUS_AWAITING_MEMBER),
            'awaiting_department' => $query->where('status', ChurchConversation::STATUS_AWAITING_DEPARTMENT),
            default => null,
        };

        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) >= 2) {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('subject', 'like', $like)
                    ->orWhereHas('member', fn ($mq) => $mq->where('name', 'like', $like));
            });
        }

        $conversations = $query->with(['member:id,name,photo_url', 'currentMinistry:id,name', 'assignee:id,name,photo_url', 'messages'])
            ->orderByDesc('last_activity_at')
            ->limit(100)
            ->get()
            ->map(fn (ChurchConversation $c) => ConversationPresenter::forLeader($c, $user))
            ->values()
            ->all();

        return Inertia::render('Mobile/NsWhats/LeaderIndex', [
            'filter' => $filter,
            'search' => $search,
            'conversations' => $conversations,
            'ministries' => $isAdmin
                ? Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])
                : ($ministryIds === []
                    ? []
                    : Ministry::query()->whereIn('id', $ministryIds)->orderBy('name')->get(['id', 'name'])),
        ]);
    }

    public function show(Request $request, ChurchConversation $conversation): Response
    {
        $this->authorize('view', $conversation);
        $user = $request->user();
        app(MarkConversationRead::class)->handle($conversation, $user);

        $payload = ConversationPresenter::forLeader(
            $conversation->fresh(['member', 'currentMinistry', 'assignee', 'preferredLeader', 'messages.author']),
            $user
        );

        $peerLeaders = NsWhatsAccess::leadersForMinistry(
            (int) $conversation->church_id,
            (int) $conversation->current_ministry_id,
            $user
        );

        $otherMinistries = Ministry::query()
            ->where('church_id', $conversation->church_id)
            ->where('id', '!=', $conversation->current_ministry_id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Mobile/NsWhats/LeaderShow', [
            'conversation' => $payload,
            'peerLeaders' => $peerLeaders,
            'otherMinistries' => $otherMinistries,
            'indexUrl' => route('mobile.ns-whats.leader.index'),
        ]);
    }

    public function sendMessage(Request $request, ChurchConversation $conversation, SendConversationMessage $send): RedirectResponse|JsonResponse
    {
        $this->authorize('sendMessage', $conversation);
        $valid = $request->validate(['content' => ['required', 'string', 'max:5000']]);
        $message = $send->handle($conversation, $request->user(), $valid['content']);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => ConversationPresenter::messagePayload($message->fresh(['author']), true),
            ]);
        }

        return redirect()->route('mobile.ns-whats.leader.show', $conversation);
    }

    public function claim(Request $request, ChurchConversation $conversation, ClaimConversation $claim): RedirectResponse
    {
        $this->authorize('claim', $conversation);
        $claim->handle($conversation, $request->user());

        return redirect()->route('mobile.ns-whats.leader.show', $conversation)
            ->with('success', 'Conversa assumida.');
    }

    public function transfer(Request $request, ChurchConversation $conversation, TransferConversation $transfer): RedirectResponse
    {
        $this->authorize('transfer', $conversation);
        $valid = $request->validate([
            'to_user_id' => ['required', 'integer'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $transfer->handle($conversation, $request->user(), (int) $valid['to_user_id'], $valid['reason'] ?? null);

        return redirect()->route('mobile.ns-whats.leader.show', $conversation)
            ->with('success', 'Conversa transferida.');
    }

    public function forward(Request $request, ChurchConversation $conversation, ForwardConversation $forward): RedirectResponse
    {
        $this->authorize('forward', $conversation);
        $valid = $request->validate([
            'to_ministry_id' => ['required', 'integer'],
            'to_leader_user_id' => ['nullable', 'integer'],
            'reason' => ['nullable', 'string', 'max:500'],
            'internal_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $forward->handle($conversation, $request->user(), $valid);

        return redirect()->route('mobile.ns-whats.leader.index')
            ->with('success', 'Conversa encaminhada.');
    }

    public function internalNote(Request $request, ChurchConversation $conversation, SendConversationMessage $send): RedirectResponse
    {
        $this->authorize('addInternalNote', $conversation);
        $valid = $request->validate(['content' => ['required', 'string', 'max:5000']]);
        $send->handle($conversation, $request->user(), $valid['content'], ChurchConversationMessage::KIND_INTERNAL);

        return redirect()->route('mobile.ns-whats.leader.show', $conversation)
            ->with('success', 'Observação interna salva.');
    }
}
