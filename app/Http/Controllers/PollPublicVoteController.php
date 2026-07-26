<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePollVoteRequest;
use App\Models\Poll;
use App\Support\PollPresenter;
use App\Support\PollVoting;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PollPublicVoteController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $poll = $this->resolveOpenPoll($token);
        $user = $request->user();
        $ip = PollVoting::clientIp($request);
        $hasVoted = PollVoting::hasVoted($poll, $user, $ip);

        return Inertia::render('Polls/Vote', [
            'poll' => PollPresenter::forPublicVote($poll, $user, $hasVoted, $ip),
            'vote_url' => route('polls.vote.store', ['token' => $poll->public_token]),
            'display_url' => $poll->display_enabled
                ? route('polls.display', ['token' => $poll->public_token])
                : null,
        ]);
    }

    public function store(StorePollVoteRequest $request, string $token)
    {
        $poll = $this->resolveOpenPoll($token);

        try {
            PollVoting::cast($poll, $request, $request->validated('option_ids'));
        } catch (ValidationException $e) {
            throw $e;
        }

        return redirect()
            ->route('polls.vote', ['token' => $poll->public_token])
            ->with('success', 'Resposta enviada! Confira o resultado.');
    }

    private function resolveOpenPoll(string $token): Poll
    {
        $poll = Poll::query()
            ->where('public_token', $token)
            ->where('status', Poll::STATUS_OPEN)
            ->firstOrFail();

        $poll->load([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
        ]);

        return $poll;
    }
}
