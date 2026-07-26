<?php

namespace App\Http\Controllers;

use App\Models\Poll;
use App\Support\PollPresenter;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class PollDisplayController extends Controller
{
    public function show(string $token): Response
    {
        $poll = $this->resolveEnabledPoll($token);

        return Inertia::render('Polls/Display', [
            'poll' => PollPresenter::forDisplay($poll),
        ]);
    }

    public function data(string $token): JsonResponse
    {
        $poll = $this->resolveEnabledPoll($token);

        return response()->json([
            'question' => $poll->question,
            'results' => PollPresenter::resultsPayload($poll, null, false),
            'display_bg_color' => $poll->display_bg_color ?: '#0f172a',
            'display_font' => $poll->display_font ?: 'sans',
            'display_chart' => $poll->display_chart ?: 'bar',
            'display_logo' => $poll->display_logo ?: 'horizontal-color',
            'display_logo_url' => Poll::displayLogoPath($poll->display_logo ?: 'horizontal-color'),
        ]);
    }

    private function resolveEnabledPoll(string $token): Poll
    {
        $poll = Poll::query()
            ->where('public_token', $token)
            ->where('display_enabled', true)
            ->firstOrFail();

        $poll->load([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'options.votes',
        ]);

        return $poll;
    }
}
