<?php

namespace App\Support;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class PollVoting
{
    public static function clientIp(Request $request): string
    {
        $ip = $request->ip();

        return is_string($ip) && $ip !== '' ? $ip : '0.0.0.0';
    }

    public static function voterKey(?User $user, string $ip): string
    {
        if ($user !== null) {
            return 'u:'.$user->id;
        }

        return 'ip:'.hash('sha256', $ip);
    }

    public static function hasVoted(Poll $poll, ?User $user, string $ip): bool
    {
        if ($user !== null) {
            return $poll->votes()
                ->where(function ($q) use ($user) {
                    $q->where('voter_key', self::voterKey($user, ''))
                        ->orWhere('user_id', $user->id);
                })
                ->exists();
        }

        return $poll->votes()
            ->where(function ($q) use ($ip) {
                $q->where('voter_ip', $ip)
                    ->orWhere('voter_key', self::voterKey(null, $ip));
            })
            ->exists();
    }

    /**
     * @param  list<int>  $optionIds
     * @return list<int>
     */
    public static function cast(Poll $poll, Request $request, array $optionIds): array
    {
        if ($poll->isTextResponse()) {
            throw ValidationException::withMessages([
                'option_ids' => 'Esta enquete pede uma resposta em texto.',
            ]);
        }

        if (! $poll->isOpen()) {
            throw ValidationException::withMessages([
                'option_ids' => 'Esta enquete está encerrada.',
            ]);
        }

        $user = $request->user();
        $ip = self::clientIp($request);
        $voterKey = self::voterKey($user, $ip);

        if (self::hasVoted($poll, $user, $ip)) {
            throw ValidationException::withMessages([
                'option_ids' => 'Você já respondeu esta enquete.',
            ]);
        }

        $optionIds = collect($optionIds)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        // Sempre 1 opção por votante
        if (count($optionIds) !== 1) {
            throw ValidationException::withMessages([
                'option_ids' => 'Selecione apenas uma opção.',
            ]);
        }

        $optionId = $optionIds[0];
        $option = $poll->options()->whereKey($optionId)->first();
        if ($option === null) {
            throw ValidationException::withMessages([
                'option_ids' => 'Opção inválida para esta enquete.',
            ]);
        }

        if ($option->isWriteIn()) {
            $optionId = self::resolveWriteInOption(
                $poll,
                (string) $request->input('other_text', ''),
            )->id;
        }

        try {
            DB::transaction(function () use ($poll, $user, $ip, $voterKey, $optionId) {
                PollVote::query()->create([
                    'poll_id' => $poll->id,
                    'poll_option_id' => $optionId,
                    'answer_text' => null,
                    'user_id' => $user?->id,
                    'voter_ip' => $ip,
                    'voter_key' => $voterKey,
                ]);
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'option_ids' => 'Você já respondeu esta enquete.',
            ]);
        }

        return [$optionId];
    }

    public static function castText(Poll $poll, Request $request, string $answerText): string
    {
        if (! $poll->isTextResponse()) {
            throw ValidationException::withMessages([
                'answer_text' => 'Esta enquete não aceita texto livre.',
            ]);
        }

        if (! $poll->isOpen()) {
            throw ValidationException::withMessages([
                'answer_text' => 'Esta enquete está encerrada.',
            ]);
        }

        $answer = trim(preg_replace("/\r\n?/", "\n", $answerText) ?? $answerText);
        $answer = preg_replace("/\n{3,}/", "\n\n", $answer) ?? $answer;
        $lineCount = substr_count($answer, "\n") + ($answer === '' ? 0 : 1);
        if ($answer === '') {
            throw ValidationException::withMessages([
                'answer_text' => 'Escreva sua sugestão.',
            ]);
        }
        if ($lineCount > 2) {
            throw ValidationException::withMessages([
                'answer_text' => 'Use no máximo duas linhas.',
            ]);
        }
        if (mb_strlen($answer) > Poll::TEXT_ANSWER_MAX) {
            throw ValidationException::withMessages([
                'answer_text' => 'Texto muito longo (máximo '.Poll::TEXT_ANSWER_MAX.' caracteres).',
            ]);
        }

        $user = $request->user();
        $ip = self::clientIp($request);
        $voterKey = self::voterKey($user, $ip);

        if (self::hasVoted($poll, $user, $ip)) {
            throw ValidationException::withMessages([
                'answer_text' => 'Você já respondeu esta enquete.',
            ]);
        }

        try {
            DB::transaction(function () use ($poll, $user, $ip, $voterKey, $answer) {
                PollVote::query()->create([
                    'poll_id' => $poll->id,
                    'poll_option_id' => null,
                    'answer_text' => $answer,
                    'user_id' => $user?->id,
                    'voter_ip' => $ip,
                    'voter_key' => $voterKey,
                ]);
            });
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([
                'answer_text' => 'Você já respondeu esta enquete.',
            ]);
        }

        return $answer;
    }

    /**
     * Digitação em «Outros» vira (ou reutiliza) uma opção normal da enquete.
     */
    public static function resolveWriteInOption(Poll $poll, string $rawLabel): PollOption
    {
        $label = trim(preg_replace('/\s+/u', ' ', $rawLabel) ?? $rawLabel);

        if ($label === '') {
            throw ValidationException::withMessages([
                'other_text' => 'Escreva o nome do personagem.',
            ]);
        }

        if (mb_strlen($label) > Poll::WRITE_IN_TEXT_MAX) {
            throw ValidationException::withMessages([
                'other_text' => 'Texto muito longo (máximo '.Poll::WRITE_IN_TEXT_MAX.' caracteres).',
            ]);
        }

        if (Poll::isWriteInLabel($label)) {
            throw ValidationException::withMessages([
                'other_text' => 'Escreva outro nome.',
            ]);
        }

        return DB::transaction(function () use ($poll, $label) {
            $existing = $poll->options()
                ->where('is_write_in', false)
                ->get()
                ->first(fn (PollOption $option) => mb_strtolower($option->label) === mb_strtolower($label)
                    && ! $option->isWriteIn());

            if ($existing !== null) {
                return $existing;
            }

            $writeIn = $poll->options()->where('is_write_in', true)->first()
                ?? $poll->options()->get()->first(fn (PollOption $o) => $o->isWriteIn());

            $maxOrder = (int) $poll->options()
                ->where('is_write_in', false)
                ->max('sort_order');

            $created = PollOption::query()->create([
                'poll_id' => $poll->id,
                'label' => $label,
                'sort_order' => $maxOrder + 1,
                'is_write_in' => false,
            ]);

            if ($writeIn !== null) {
                $writeIn->update([
                    'sort_order' => $created->sort_order + 1,
                    'is_write_in' => true,
                    'label' => Poll::WRITE_IN_OPTION_LABEL,
                ]);
            }

            self::sortChoiceOptionsAlphabetically($poll);

            return $created->fresh();
        });
    }

    /** Ordena opções (exceto «Outros») em ordem alfabética pt_BR; «Outros» fica no fim. */
    public static function sortChoiceOptionsAlphabetically(Poll $poll): void
    {
        $options = $poll->options()->get();
        $writeIn = $options->first(fn (PollOption $o) => $o->isWriteIn());
        $regular = $options->filter(fn (PollOption $o) => ! $o->isWriteIn())->values();

        $labels = $regular->pluck('label')->all();
        if (class_exists(\Collator::class)) {
            $collator = new \Collator('pt_BR');
            usort($labels, static fn (string $a, string $b): int => $collator->compare($a, $b));
        } else {
            natcasesort($labels);
            $labels = array_values($labels);
        }

        $byLabel = $regular->keyBy(fn (PollOption $o) => mb_strtolower($o->label));
        foreach ($labels as $index => $label) {
            $option = $byLabel->get(mb_strtolower($label));
            if ($option !== null) {
                $option->update(['sort_order' => $index]);
            }
        }

        if ($writeIn !== null) {
            $writeIn->update([
                'sort_order' => count($labels),
                'is_write_in' => true,
                'label' => Poll::WRITE_IN_OPTION_LABEL,
            ]);
        }
    }
}
