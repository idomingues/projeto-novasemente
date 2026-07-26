<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ClaimConversation;
use App\Actions\Conversations\CloseConversation;
use App\Actions\Conversations\CreateConversation;
use App\Actions\Conversations\EditConversationMessage;
use App\Actions\Conversations\EnsureMemberServedLeaderThreads;
use App\Actions\Conversations\ForwardConversation;
use App\Actions\Conversations\MarkConversationRead;
use App\Actions\Conversations\ReopenConversation;
use App\Actions\Conversations\SendConversationMessage;
use App\Actions\Conversations\TransferConversation;
use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\ChurchConversationEvent;
use App\Models\ChurchConversationMessage;
use App\Models\Ministry;
use App\Models\User;
use App\Support\ConversationPresenter;
use App\Support\NsWhatsAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MobileNsWhatsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user === null) {
            return Inertia::render('Mobile/NsWhats/GuestGate', [
                'registerUrl' => route('register'),
                'redirectAfterLogin' => route('mobile.ns-whats.index', [], false),
                'continueUrl' => route('mobile.home', [], false),
            ]);
        }

        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        app(EnsureMemberServedLeaderThreads::class)->handle($user, (int) $churchId);

        $tab = (string) $request->query('tab', 'open');
        if (! in_array($tab, ['open', 'closed'], true)) {
            $tab = 'open';
        }

        $servedMinistryIds = NsWhatsAccess::ministryIdsWhereUserServes($user, (int) $churchId);
        $servedLeaderIds = [];
        foreach ($servedMinistryIds as $ministryId) {
            foreach (NsWhatsAccess::leadersForMinistry((int) $churchId, $ministryId, $user) as $leaderRow) {
                $servedLeaderIds[(int) $leaderRow['id']] = true;
            }
        }

        $query = ChurchConversation::query()
            ->where('church_id', $churchId)
            ->where(function ($q) use ($user) {
                $q->where('member_user_id', $user->id)
                    ->orWhere('assignee_user_id', $user->id)
                    ->orWhere('preferred_leader_user_id', $user->id);
            })
            ->with(['currentMinistry:id,name,icon', 'assignee:id,name,photo_url', 'member:id,name,photo_url', 'messages' => fn ($q) => $q->orderBy('created_at')])
            ->orderByDesc('last_activity_at');

        if ($tab === 'closed') {
            $query->where('status', ChurchConversation::STATUS_CLOSED);
        } else {
            $query->where('status', '!=', ChurchConversation::STATUS_CLOSED);
        }

        $search = trim((string) $request->query('q', ''));
        if (mb_strlen($search) >= 2) {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like) {
                $q->where('subject', 'like', $like)
                    ->orWhereHas('currentMinistry', fn ($mq) => $mq->where('name', 'like', $like))
                    ->orWhereHas('assignee', fn ($aq) => $aq->where('name', 'like', $like))
                    ->orWhereHas('messages', fn ($mq) => $mq
                        ->where('kind', ChurchConversationMessage::KIND_PUBLIC)
                        ->where('body', 'like', $like));
            });
        }

        $conversations = $query->limit(80)->get()
            ->sortBy(function (ChurchConversation $c) use ($user, $servedLeaderIds) {
                $asMember = (int) $c->member_user_id === (int) $user->id;
                $isServedLeaderThread = $asMember
                    && $c->assignee_user_id
                    && isset($servedLeaderIds[(int) $c->assignee_user_id]);

                // Líderes dos departamentos em que serve ficam no topo.
                $pin = $isServedLeaderThread ? 0 : 1;
                $activity = $c->last_activity_at?->getTimestamp() ?? 0;

                return sprintf('%d-%020d', $pin, PHP_INT_MAX - $activity);
            })
            ->values()
            ->map(function (ChurchConversation $c) use ($user, $servedLeaderIds) {
                $asMember = (int) $c->member_user_id === (int) $user->id;
                $pinnedLeader = $asMember
                    && $c->assignee_user_id
                    && isset($servedLeaderIds[(int) $c->assignee_user_id]);

                $payload = $asMember
                    ? array_merge(ConversationPresenter::forMember($c, $user), ['viewerRole' => 'member'])
                    : array_merge(ConversationPresenter::forLeader($c, $user), ['viewerRole' => 'staff']);

                $payload['pinnedLeader'] = $pinnedLeader;

                return $payload;
            })
            ->all();

        $openId = $request->query('conversa');
        $selected = null;
        if ($openId) {
            $row = ChurchConversation::query()
                ->where('church_id', $churchId)
                ->whereKey((int) $openId)
                ->where(function ($q) use ($user) {
                    $q->where('member_user_id', $user->id)
                        ->orWhere('assignee_user_id', $user->id)
                        ->orWhere('preferred_leader_user_id', $user->id);
                })
                ->first();
            if ($row && $user->can('view', $row)) {
                app(MarkConversationRead::class)->handle($row, $user);
                $fresh = $row->fresh(['currentMinistry', 'assignee', 'member', 'preferredLeader', 'messages.author']);
                $asMember = (int) $row->member_user_id === (int) $user->id;
                $selected = $asMember
                    ? array_merge(ConversationPresenter::forMember($fresh, $user), ['viewerRole' => 'member'])
                    : array_merge(ConversationPresenter::forLeader($fresh, $user), ['viewerRole' => 'staff']);
            }
        }

        $composing = $request->boolean('nova') || $request->query('ministry');
        $ministryId = $request->query('ministry') ? (int) $request->query('ministry') : null;
        $recipientId = $request->query('recipient') ? (int) $request->query('recipient') : null;
        $prefillMessage = trim((string) $request->query('mensagem', ''));
        if (mb_strlen($prefillMessage) > 500) {
            $prefillMessage = mb_substr($prefillMessage, 0, 500);
        }
        $ministries = NsWhatsAccess::ministriesWithContacts($churchId, $user);
        $leaders = [];
        $members = [];
        $selectedMinistry = null;
        $composeDraft = null;
        if ($ministryId) {
            $selectedMinistry = collect($ministries)->firstWhere('id', $ministryId);
            if ($selectedMinistry) {
                $leaders = NsWhatsAccess::leadersForMinistry($churchId, $ministryId, $user);
                $members = NsWhatsAccess::membersForMinistry($churchId, $ministryId, $user);
            }
        }

        if ($composing && $selectedMinistry && $recipientId) {
            $person = collect(array_merge($leaders, $members))->firstWhere('id', $recipientId);
            if ($person) {
                $role = ($person['role'] ?? '') === 'leader' ? 'Líder' : 'Voluntário';
                $composeDraft = [
                    'ministryId' => (int) $selectedMinistry['id'],
                    'ministryName' => (string) $selectedMinistry['name'],
                    'recipientUserId' => $recipientId,
                    'title' => (string) $person['name'],
                    'subtitle' => $role.' · '.$selectedMinistry['name'],
                    'photoUrl' => $person['photo_url'] ?? null,
                    'useFallback' => false,
                    'prefillMessage' => $prefillMessage,
                ];
            }
        }

        return Inertia::render('Mobile/NsWhats/Index', [
            'tab' => $tab,
            'search' => $search,
            'conversations' => $conversations,
            'selected' => $selected,
            'composing' => (bool) $composing,
            'composeDraft' => $composeDraft,
            'ministries' => $ministries,
            'selectedMinistry' => $selectedMinistry,
            'leaders' => $leaders,
            'members' => $members,
            'storeUrl' => route('mobile.ns-whats.store'),
            'departmentQueueUrl' => NsWhatsAccess::isMinistryLeaderAccount($user) || NsWhatsAccess::isModuleAdmin($user)
                ? route('mobile.ns-whats.leader.index', ['filter' => 'unclaimed'])
                : null,
            'fallbackMinistryConfigured' => Church::query()
                ->whereKey($churchId)
                ->whereNotNull('conversation_fallback_ministry_id')
                ->exists(),
        ]);
    }

    public function compose(Request $request): RedirectResponse
    {
        $query = ['nova' => 1];
        if ($request->query('ministry')) {
            $query['ministry'] = (int) $request->query('ministry');
        }
        if ($request->query('recipient')) {
            $query['recipient'] = (int) $request->query('recipient');
        }
        $mensagem = trim((string) $request->query('mensagem', ''));
        if ($mensagem !== '') {
            $query['mensagem'] = mb_substr($mensagem, 0, 500);
        }

        return redirect()->route('mobile.ns-whats.index', $query);
    }

    public function store(Request $request, CreateConversation $create): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'ministry_id' => ['nullable', 'integer'],
            'leader_user_id' => ['nullable', 'integer'],
            'recipient_user_id' => ['nullable', 'integer'],
            'message' => ['required', 'string', 'min:3', 'max:5000'],
            'use_fallback' => ['sometimes', 'boolean'],
        ]);

        if (! empty($valid['use_fallback'])) {
            $conversation = $create->handleFallback($user, (int) $churchId, $valid['message']);
        } else {
            if (empty($valid['ministry_id'])) {
                throw ValidationException::withMessages([
                    'ministry_id' => ['Escolha um departamento.'],
                ]);
            }
            $conversation = $create->handle($user, (int) $churchId, [
                'ministry_id' => (int) $valid['ministry_id'],
                'recipient_user_id' => $valid['recipient_user_id'] ?? $valid['leader_user_id'] ?? null,
                'message' => $valid['message'],
            ]);
        }

        return redirect()->route('mobile.ns-whats.index', [
            'conversa' => $conversation->id,
        ])->with('success', 'Conversa iniciada.');
    }

    public function show(Request $request, ChurchConversation $conversation): RedirectResponse|JsonResponse
    {
        $this->authorize('view', $conversation);
        $user = $request->user();
        abort_unless($user, 401);

        if ($request->expectsJson()) {
            app(MarkConversationRead::class)->handle($conversation, $user);

            $fresh = $conversation->fresh(['currentMinistry', 'assignee', 'preferredLeader', 'member', 'messages.author']);
            $asMember = (int) $conversation->member_user_id === (int) $user->id;
            $payload = $asMember
                ? array_merge(ConversationPresenter::forMember($fresh, $user), ['viewerRole' => 'member'])
                : array_merge(ConversationPresenter::forLeader($fresh, $user), ['viewerRole' => 'staff']);

            return response()->json([
                'conversation' => $payload,
            ]);
        }

        return redirect()->route('mobile.ns-whats.index', [
            'conversa' => $conversation->id,
        ]);
    }

    public function sendMessage(Request $request, ChurchConversation $conversation, SendConversationMessage $send, MarkConversationRead $markRead): RedirectResponse|JsonResponse
    {
        $this->authorize('sendMessage', $conversation);
        $valid = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);
        $message = $send->handle($conversation, $request->user(), $valid['content']);
        $markRead->handle($conversation->fresh(), $request->user());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => ConversationPresenter::messagePayload($message->fresh(['author'])),
            ]);
        }

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $conversation->id]);
    }

    public function editMessage(Request $request, ChurchConversationMessage $message, EditConversationMessage $edit): RedirectResponse
    {
        $this->authorize('editMessage', $message);
        $valid = $request->validate([
            'content' => ['required', 'string', 'min:1', 'max:5000'],
        ]);
        $edit->handle($message, $request->user(), $valid['content']);

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $message->conversation_id]);
    }

    public function hideMessage(Request $request, ChurchConversationMessage $message): RedirectResponse
    {
        $this->authorize('hideMessageForMember', $message);
        $message->member_hidden_at = now();
        $message->save();
        ChurchConversationEvent::create([
            'conversation_id' => $message->conversation_id,
            'type' => 'message_hidden_for_member',
            'actor_user_id' => $request->user()->id,
            'before' => null,
            'after' => ['message_id' => $message->id],
            'created_at' => now(),
        ]);

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $message->conversation_id]);
    }

    public function close(Request $request, ChurchConversation $conversation, CloseConversation $close): RedirectResponse
    {
        $this->authorize('close', $conversation);
        $close->handle($conversation, $request->user(), 'member');

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $conversation->id])
            ->with('success', 'Conversa finalizada.');
    }

    public function reopen(Request $request, ChurchConversation $conversation, ReopenConversation $reopen): RedirectResponse
    {
        $this->authorize('reopen', $conversation);
        $reopen->handle($conversation, $request->user());

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $conversation->id])
            ->with('success', 'Conversa reaberta.');
    }

    public function archive(Request $request, ChurchConversation $conversation): RedirectResponse
    {
        $this->authorize('archive', $conversation);
        $valid = $request->validate([
            'also_close' => ['sometimes', 'boolean'],
        ]);
        if (! empty($valid['also_close']) && $conversation->allowsChat()) {
            app(CloseConversation::class)->handle($conversation, $request->user(), 'member');
        }
        $conversation->member_archived_at = now();
        $conversation->save();
        ChurchConversationEvent::create([
            'conversation_id' => $conversation->id,
            'type' => 'archived_by_member',
            'actor_user_id' => $request->user()->id,
            'before' => null,
            'after' => null,
            'created_at' => now(),
        ]);

        return redirect()->route('mobile.ns-whats.index', ['tab' => 'closed'])
            ->with('success', 'Conversa arquivada.');
    }

    public function unarchive(Request $request, ChurchConversation $conversation): RedirectResponse
    {
        $this->authorize('archive', $conversation);
        $conversation->member_archived_at = null;
        $conversation->save();

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $conversation->id])
            ->with('success', 'Conversa desarquivada.');
    }

    public function markRead(Request $request, ChurchConversation $conversation, MarkConversationRead $markRead): RedirectResponse
    {
        $this->authorize('view', $conversation);
        $markRead->handle($conversation, $request->user());

        return redirect()->route('mobile.ns-whats.index', ['conversa' => $conversation->id]);
    }
}
