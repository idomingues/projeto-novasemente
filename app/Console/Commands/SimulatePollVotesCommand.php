<?php

namespace App\Console\Commands;

use App\Models\Poll;
use App\Models\PollVote;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

#[AsCommand(
    name: 'polls:simulate-votes',
    description: 'Simula votos anônimos (por IP) na enquete para testar o painel ao vivo',
)]
class SimulatePollVotesCommand extends Command
{
    private const SIM_IP_PREFIX = '203.0.113.'; // DOCUMENTATION range (RFC 5737)

    protected $signature = 'polls:simulate-votes
                            {--id= : ID da enquete (padrão: a mais recente com opções)}
                            {--interval=2 : Segundos entre cada voto}
                            {--count=40 : Quantidade de votos a inserir}
                            {--reset : Remove votos de simulações anteriores desta enquete antes de começar}';

    public function handle(): int
    {
        $poll = $this->resolvePoll();
        if ($poll === null) {
            $this->error('Nenhuma enquete encontrada com opções. Crie uma em /enquetes primeiro.');

            return self::FAILURE;
        }

        $poll->ensurePublicToken();

        if (! $poll->display_enabled) {
            $poll->forceFill(['display_enabled' => true])->save();
            $this->warn('Painel público estava desligado — liguei para o teste.');
        }

        if ((string) $poll->status !== Poll::STATUS_OPEN) {
            $poll->forceFill(['status' => Poll::STATUS_OPEN])->save();
            $this->warn('Enquete não estava aberta — abri para o teste.');
        }

        $interval = max(1, (int) $this->option('interval'));
        $count = max(1, (int) $this->option('count'));
        $publicUrl = route('polls.display', ['token' => $poll->public_token]);
        $voteUrl = route('polls.vote', ['token' => $poll->public_token]);

        if ($this->option('reset')) {
            $removed = $this->resetSimulationVotes($poll);
            $this->info("Reset: removidos {$removed} voto(s) de simulação.");
        }

        $poll->load(['options' => fn ($q) => $q->orderBy('sort_order')->orderBy('id')]);
        $options = $poll->options;
        if ($options->isEmpty()) {
            $this->error('A enquete não tem opções.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Simulação de votos — painel ao vivo');
        $this->line("Enquete #{$poll->id}: {$poll->question}");
        $this->line('Opções: '.$options->pluck('label')->implode(' · '));
        $this->line("Intervalo: {$interval}s · Total: {$count} voto(s)");
        $this->newLine();
        $this->warn('Abra o painel em outra aba:');
        $this->line($publicUrl);
        $this->comment('Link de voto público: '.$voteUrl);
        $this->newLine();

        $optionIds = $options->pluck('id')->values()->all();
        $optionLabels = $options->keyBy('id')->map(fn ($o) => $o->label);
        $usedHosts = [];

        for ($i = 1; $i <= $count; $i++) {
            $optionId = $this->pickOptionId($optionIds, $i, $count);
            do {
                $host = random_int(1, 254);
            } while (isset($usedHosts[$host]));
            $usedHosts[$host] = true;

            $ip = self::SIM_IP_PREFIX.$host;
            // Se esgotar o range, usa IPv6 de documentação
            if (count($usedHosts) >= 254 && $i < $count) {
                $ip = '2001:db8::'.Str::lower(dechex($i));
            }

            PollVote::create([
                'poll_id' => $poll->id,
                'poll_option_id' => $optionId,
                'user_id' => null,
                'voter_ip' => $ip,
                'voter_key' => 'ip:'.hash('sha256', $ip),
            ]);

            $totals = PollVote::query()
                ->where('poll_id', $poll->id)
                ->select('poll_option_id', DB::raw('count(*) as c'))
                ->groupBy('poll_option_id')
                ->pluck('c', 'poll_option_id');

            $totalVotes = (int) $totals->sum();
            $label = $optionLabels[$optionId] ?? '#'.$optionId;
            $breakdown = $options
                ->map(fn ($o) => $o->label.'='.(int) ($totals[$o->id] ?? 0))
                ->implode(' | ');

            $this->line(sprintf(
                '[%02d/%02d] +1 → %s  (total %d)  %s',
                $i,
                $count,
                $label,
                $totalVotes,
                $breakdown,
            ));

            if ($i < $count) {
                sleep($interval);
            }
        }

        $this->newLine();
        $this->info('Simulação concluída.');
        $this->line("Painel: {$publicUrl}");
        $this->comment('Para zerar votos fake e rodar de novo: php artisan polls:simulate-votes --reset');

        return self::SUCCESS;
    }

    private function resolvePoll(): ?Poll
    {
        $id = $this->option('id');
        if ($id !== null && $id !== '') {
            return Poll::query()->with('options')->find((int) $id);
        }

        return Poll::query()
            ->whereHas('options')
            ->latest('id')
            ->with('options')
            ->first();
    }

    /**
     * @param  list<int>  $optionIds
     */
    private function pickOptionId(array $optionIds, int $step, int $total): int
    {
        $n = count($optionIds);
        if ($n === 1) {
            return $optionIds[0];
        }

        if ($step % 5 === 0) {
            return $optionIds[array_rand($optionIds)];
        }

        if ($step <= (int) ceil($total * 0.4)) {
            $pool = array_slice($optionIds, 0, min(2, $n));

            return $pool[array_rand($pool)];
        }

        return $optionIds[($step - 1) % $n];
    }

    private function resetSimulationVotes(Poll $poll): int
    {
        return PollVote::query()
            ->where('poll_id', $poll->id)
            ->where(function ($q) {
                $q->where('voter_ip', 'like', self::SIM_IP_PREFIX.'%')
                    ->orWhere('voter_ip', 'like', '2001:db8:%');
            })
            ->delete();
    }
}
