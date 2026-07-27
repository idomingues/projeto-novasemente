<?php

namespace App\Support;

use App\Models\Poll;
use App\Models\User;
use Illuminate\Support\Collection;

final class PollPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function forAdminList(Poll $poll): array
    {
        $voteCount = $poll->votes_count ?? $poll->votes()->count();
        $optionCount = $poll->options_count ?? $poll->options()->count();

        return [
            'id' => $poll->id,
            'question' => $poll->question,
            'allow_multiple' => false,
            'response_type' => $poll->isTextResponse() ? Poll::RESPONSE_TEXT : Poll::RESPONSE_CHOICE,
            'response_type_label' => Poll::RESPONSE_TYPES[$poll->isTextResponse() ? Poll::RESPONSE_TEXT : Poll::RESPONSE_CHOICE],
            'shows_results' => $poll->showsResults(),
            'status' => $poll->status,
            'status_label' => Poll::STATUSES[$poll->status] ?? $poll->status,
            'options_count' => (int) $optionCount,
            'votes_count' => (int) $voteCount,
            'created_at' => $poll->created_at?->toIso8601String(),
            'updated_at' => $poll->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function forAdminDetail(Poll $poll): array
    {
        $poll->loadMissing([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'options.votes',
        ]);

        $base = self::forAdminList($poll);
        $base['options'] = $poll->isTextResponse()
            ? []
            : $poll->options->map(fn ($option) => [
                'id' => $option->id,
                'label' => $option->label,
                'sort_order' => (int) $option->sort_order,
            ])->values()->all();
        $base['results'] = $poll->showsResults() ? self::resultsPayload($poll) : null;
        $base['text_answers'] = $poll->isTextResponse() ? self::textAnswersPayload($poll) : [];
        $base['public_token'] = $poll->public_token;
        $base['public_url'] = $poll->public_token && $poll->showsResults()
            ? route('polls.display', ['token' => $poll->public_token])
            : null;
        $base['vote_url'] = $poll->public_token
            ? route('polls.vote', ['token' => $poll->public_token])
            : null;
        $base['display_bg_color'] = $poll->display_bg_color ?: '#0f172a';
        $base['display_font'] = $poll->display_font ?: 'sans';
        $base['display_chart'] = $poll->display_chart ?: 'bar';
        $base['display_logo'] = $poll->display_logo ?: 'horizontal-color';
        $base['display_logo_url'] = Poll::displayLogoPath($poll->display_logo ?: 'horizontal-color');
        $base['display_enabled'] = (bool) $poll->display_enabled && $poll->showsResults();
        $base['publish_to_feed'] = (bool) $poll->publish_to_feed;

        return $base;
    }

    /**
     * @return array<string, mixed>
     */
    public static function forDisplay(Poll $poll): array
    {
        $poll->loadMissing([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'options.votes',
        ]);

        $logoKey = $poll->display_logo ?: 'horizontal-color';

        return [
            'question' => $poll->question,
            'allow_multiple' => false,
            'display_bg_color' => $poll->display_bg_color ?: '#0f172a',
            'display_font' => $poll->display_font ?: 'sans',
            'display_chart' => $poll->display_chart ?: 'bar',
            'display_logo' => $logoKey,
            'display_logo_url' => Poll::displayLogoPath($logoKey),
            'results' => self::resultsPayload($poll),
            'data_url' => route('polls.display.data', ['token' => $poll->public_token]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function forMobileList(Poll $poll, bool $hasVoted): array
    {
        $payload = [
            'id' => $poll->id,
            'question' => $poll->question,
            'allow_multiple' => false,
            'response_type' => $poll->isTextResponse() ? Poll::RESPONSE_TEXT : Poll::RESPONSE_CHOICE,
            'shows_results' => $poll->showsResults(),
            'status' => $poll->status,
            'status_label' => Poll::STATUSES[$poll->status] ?? $poll->status,
            'has_voted' => $hasVoted,
            'options_count' => (int) ($poll->options_count ?? $poll->options()->count()),
            'results' => null,
            'my_answer_text' => null,
        ];

        if ($hasVoted && $poll->showsResults()) {
            $payload['results'] = self::resultsPayload($poll);
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public static function forMobileShow(Poll $poll, ?User $viewer, bool $includeResults, ?bool $hasVoted = null): array
    {
        $poll->loadMissing([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
        ]);

        $includeResults = $includeResults && $poll->showsResults();

        if ($includeResults) {
            $poll->loadMissing(['options.votes']);
        }

        $viewerId = $viewer?->id;
        $selectedOptionIds = [];
        $myAnswerText = null;
        $voted = $hasVoted ?? false;

        if ($viewerId !== null || $voted) {
            $voteQuery = $poll->votes();
            if ($viewerId) {
                $voteQuery->where(function ($q) use ($viewerId) {
                    $q->where('user_id', $viewerId)->orWhere('voter_key', 'u:'.$viewerId);
                });
            }
            $myVote = $voteQuery->latest('id')->first();
            if ($myVote) {
                $voted = true;
                if ($poll->isTextResponse()) {
                    $myAnswerText = $myVote->answer_text;
                } else {
                    $selectedOptionIds = [(int) $myVote->poll_option_id];
                }
            }
        }

        return [
            'id' => $poll->id,
            'question' => $poll->question,
            'allow_multiple' => false,
            'response_type' => $poll->isTextResponse() ? Poll::RESPONSE_TEXT : Poll::RESPONSE_CHOICE,
            'shows_results' => $poll->showsResults(),
            'text_answer_max' => Poll::TEXT_ANSWER_MAX,
            'status' => $poll->status,
            'status_label' => Poll::STATUSES[$poll->status] ?? $poll->status,
            'is_open' => $poll->isOpen(),
            'has_voted' => $voted,
            'options' => $poll->isTextResponse()
                ? []
                : $poll->options->map(fn ($option) => [
                    'id' => $option->id,
                    'label' => $option->label,
                ])->values()->all(),
            'selected_option_ids' => $selectedOptionIds,
            'my_answer_text' => $myAnswerText,
            'results' => $includeResults ? self::resultsPayload($poll) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function forPublicVote(Poll $poll, ?User $viewer, bool $hasVoted, string $ip): array
    {
        return self::forMobileShow($poll, $viewer, $hasVoted && $poll->showsResults(), $hasVoted);
    }

    /**
     * Respostas em texto sem identificar quem enviou.
     *
     * @return list<array{id: int, answer_text: string, created_at: string|null}>
     */
    public static function textAnswersPayload(Poll $poll): array
    {
        return $poll->votes()
            ->whereNotNull('answer_text')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn ($vote) => [
                'id' => (int) $vote->id,
                'answer_text' => (string) $vote->answer_text,
                'created_at' => $vote->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * Resultados agregados apenas (porcentagem). Sem lista de votantes.
     *
     * @return array{total_votes: int, options: list<array<string, mixed>>}
     */
    public static function resultsPayload(Poll $poll): array
    {
        $poll->loadMissing([
            'options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'options.votes',
        ]);

        /** @var Collection<int, \App\Models\PollOption> $options */
        $options = $poll->options;
        $totalVotes = $options->sum(fn ($option) => $option->votes->count());

        return [
            'total_votes' => (int) $totalVotes,
            'options' => $options->map(function ($option) use ($totalVotes) {
                $count = $option->votes->count();
                $percent = $totalVotes > 0 ? (int) round(($count / $totalVotes) * 100) : 0;

                return [
                    'id' => $option->id,
                    'label' => $option->label,
                    'votes_count' => $count,
                    'percent' => $percent,
                ];
            })->values()->all(),
        ];
    }
}
