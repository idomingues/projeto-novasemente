<?php

namespace App\Http\Controllers;

use App\Actions\Conversations\ClaimConversation;
use App\Actions\Conversations\ForwardConversation;
use App\Actions\Conversations\SendConversationMessage;
use App\Actions\Conversations\TransferConversation;
use App\Models\Church;
use App\Models\ChurchConversation;
use App\Models\Ministry;
use App\Support\ConversationPresenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConversationAdminController extends Controller
{
    private function backToModal(ChurchConversation $conversation, ?string $success = null): RedirectResponse
    {
        $redirect = redirect()->route('conversations.index', ['modal' => $conversation->id]);

        return $success ? $redirect->with('success', $success) : $redirect;
    }

    public function index(Request $request): Response
    {
        $this->authorize('admin', ChurchConversation::class);
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $status = (string) $request->query('status', '');
        $ministryId = $request->query('ministry_id') ? (int) $request->query('ministry_id') : null;

        $base = ChurchConversation::query()->where('church_id', $churchId);

        $kpis = [
            'open' => (clone $base)->count(),
            'new' => (clone $base)->where('status', ChurchConversation::STATUS_NEW)->count(),
            'unassigned' => (clone $base)->whereNull('assignee_user_id')->count(),
            'awaiting' => (clone $base)->whereIn('status', [
                ChurchConversation::STATUS_AWAITING_MEMBER,
                ChurchConversation::STATUS_AWAITING_DEPARTMENT,
            ])->count(),
            'forwards' => \App\Models\ChurchConversationForward::query()
                ->whereHas('conversation', fn ($q) => $q->where('church_id', $churchId))
                ->count(),
        ];

        $byMinistry = ChurchConversation::query()
            ->where('church_id', $churchId)
            ->selectRaw('current_ministry_id, count(*) as c')
            ->groupBy('current_ministry_id')
            ->pluck('c', 'current_ministry_id');

        $ministries = Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name'])
            ->map(fn (Ministry $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'openCount' => (int) ($byMinistry[$m->id] ?? 0),
            ]);

        $list = ChurchConversation::query()
            ->where('church_id', $churchId)
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->when($ministryId, fn ($q) => $q->where('current_ministry_id', $ministryId))
            ->with(['member:id,name,photo_url', 'currentMinistry:id,name', 'assignee:id,name,photo_url'])
            ->orderByDesc('last_activity_at')
            ->limit(100)
            ->get()
            ->map(fn (ChurchConversation $c) => ConversationPresenter::forLeader($c, $request->user()))
            ->values()
            ->all();

        $modal = null;
        if ($request->query('modal')) {
            $row = ChurchConversation::query()
                ->where('church_id', $churchId)
                ->whereKey((int) $request->query('modal'))
                ->with(['member', 'currentMinistry', 'assignee', 'messages.author', 'events.actor', 'transfers', 'forwards'])
                ->first();
            if ($row) {
                $modal = ConversationPresenter::forLeader($row, $request->user());
                $modal['events'] = $row->events->map(fn ($e) => [
                    'id' => $e->id,
                    'type' => $e->type,
                    'actorName' => $e->actor?->name,
                    'createdAt' => $e->created_at?->toIso8601String(),
                    'after' => $e->after,
                ])->values()->all();
            }
        }

        $church = Church::query()->find($churchId);

        return Inertia::render('Conversations/Index', [
            'kpis' => $kpis,
            'ministries' => $ministries,
            'conversations' => $list,
            'filters' => [
                'status' => $status,
                'ministry_id' => $ministryId,
            ],
            'modal' => $modal,
            'settings' => [
                'fallback_ministry_id' => $church?->conversation_fallback_ministry_id,
            ],
            'ministryOptions' => Ministry::query()->where('church_id', $churchId)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $this->authorize('admin', ChurchConversation::class);
        $churchId = Church::resolveWorkingId($request);
        abort_unless($churchId, 404);

        $valid = $request->validate([
            'conversation_fallback_ministry_id' => ['nullable', 'integer', 'exists:ministries,id'],
        ]);

        Church::query()->whereKey($churchId)->update([
            'conversation_fallback_ministry_id' => $valid['conversation_fallback_ministry_id'] ?: null,
        ]);

        return back()->with('success', 'Configurações do NS Conecta salvas.');
    }

    public function claim(Request $request, ChurchConversation $conversation, ClaimConversation $claim): RedirectResponse
    {
        $this->authorize('claim', $conversation);
        $claim->handle($conversation, $request->user());

        return $this->backToModal($conversation, 'Conversa assumida.');
    }

    public function sendMessage(Request $request, ChurchConversation $conversation, SendConversationMessage $send): RedirectResponse
    {
        $this->authorize('sendMessage', $conversation);
        $valid = $request->validate(['content' => ['required', 'string', 'max:5000']]);
        $send->handle($conversation, $request->user(), $valid['content']);

        return $this->backToModal($conversation);
    }

    public function transfer(Request $request, ChurchConversation $conversation, TransferConversation $transfer): RedirectResponse
    {
        $this->authorize('transfer', $conversation);
        $valid = $request->validate([
            'to_user_id' => ['required', 'integer'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);
        $transfer->handle($conversation, $request->user(), (int) $valid['to_user_id'], $valid['reason'] ?? null);

        return $this->backToModal($conversation, 'Conversa transferida.');
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

        return $this->backToModal($conversation, 'Conversa encaminhada.');
    }
}
