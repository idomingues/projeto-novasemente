<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePollVoteRequest;
use App\Models\Church;
use App\Models\Poll;
use App\Support\PollPresenter;
use App\Support\PollVoting;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PollMobileController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $churchId = $this->currentChurchId();
        $ip = PollVoting::clientIp($request);

        $polls = Poll::query()
            ->forChurch($churchId)
            ->withCount('options')
            ->with([
                'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
                'options.votes',
            ])
            ->where(function ($q) use ($user) {
                $q->where('status', Poll::STATUS_OPEN)
                    ->orWhereExists(function ($sub) use ($user) {
                        $sub->selectRaw('1')
                            ->from('poll_votes')
                            ->whereColumn('poll_votes.poll_id', 'polls.id')
                            ->where(function ($inner) use ($user) {
                                $inner->where('poll_votes.user_id', $user->id)
                                    ->orWhere('poll_votes.voter_key', 'u:'.$user->id);
                            });
                    });
            })
            ->latest()
            ->get();

        return Inertia::render('Mobile/Polls/Index', [
            'polls' => $polls
                ->map(function (Poll $poll) use ($user, $ip) {
                    $hasVoted = PollVoting::hasVoted($poll, $user, $ip);

                    return PollPresenter::forMobileList($poll, $hasVoted);
                })
                ->values()
                ->all(),
        ]);
    }

    public function show(Request $request, Poll $poll): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);
        $this->assertVisible($poll, $user->id);

        $ip = PollVoting::clientIp($request);
        $hasVoted = PollVoting::hasVoted($poll, $user, $ip);
        $canSeeResults = $poll->showsResults()
            && ($hasVoted || ($user->can('polls.manage') && (int) $poll->church_id === (int) $this->currentChurchId()));

        return Inertia::render('Mobile/Polls/Show', [
            'poll' => PollPresenter::forMobileShow($poll, $user, $canSeeResults, $hasVoted),
        ]);
    }

    public function vote(StorePollVoteRequest $request, Poll $poll)
    {
        $user = $request->user();
        abort_unless($user !== null, 403);
        $this->assertSameChurch($poll);

        try {
            if ($poll->isTextResponse()) {
                PollVoting::castText($poll, $request, (string) $request->validated('answer_text'));
                $message = 'Sugestão enviada! Obrigado pela contribuição.';
            } else {
                PollVoting::cast($poll, $request, $request->validated('option_ids'));
                $message = 'Resposta enviada! Confira o resultado.';
            }
        } catch (ValidationException $e) {
            throw $e;
        }

        return redirect()
            ->route('mobile.polls.show', $poll)
            ->with('success', $message);
    }

    private function assertSameChurch(Poll $poll): void
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $poll->church_id !== (int) $churchId) {
            abort(404);
        }
    }

    private function assertVisible(Poll $poll, int $userId): void
    {
        $this->assertSameChurch($poll);

        if ($poll->isOpen()) {
            return;
        }

        if ($poll->userHasVoted($userId)) {
            return;
        }

        abort(404);
    }
}
