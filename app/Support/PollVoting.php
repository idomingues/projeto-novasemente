<?php

namespace App\Support;

use App\Models\Poll;
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
        $valid = $poll->options()->whereKey($optionId)->exists();
        if (! $valid) {
            throw ValidationException::withMessages([
                'option_ids' => 'Opção inválida para esta enquete.',
            ]);
        }

        try {
            DB::transaction(function () use ($poll, $user, $ip, $voterKey, $optionId) {
                PollVote::query()->create([
                    'poll_id' => $poll->id,
                    'poll_option_id' => $optionId,
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
}
