<?php

namespace Database\Seeders;

use App\Models\Church;
use App\Models\Poll;
use App\Models\PollOption;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Enquetes de lançamento (produção): 3 perguntas, 0 votos.
 *
 * Preferir: php artisan polls:seed-launch
 * Ou: php artisan db:seed --class=PollsLaunchSeeder
 */
class PollsLaunchSeeder extends Seeder
{
    /** @var list<array{question: string, options: list<string>}> */
    public const POLLS = [
        [
            'question' => 'Qual milagre de Jesus você gostaria de ter presenciado?',
            'options' => [
                'A ressurreição de Lázaro',
                'Jesus acalmando a tempestade',
                'A multiplicação dos pães',
                'A cura do cego',
            ],
        ],
        [
            'question' => 'Se você pudesse conversar por cinco minutos com um personagem bíblico, quem escolheria?',
            'options' => [
                'Moisés',
                'Davi',
                'Ester',
                'Paulo',
            ],
        ],
        [
            'question' => 'Qual palavra representa melhor o que você precisa neste momento?',
            'options' => [
                'Esperança',
                'Paz',
                'Coragem',
                'Direção',
            ],
        ],
        [
            'question' => 'O que você gostaria de encontrar em nosso App?',
            'response_type' => Poll::RESPONSE_TEXT,
            'options' => [],
        ],
    ];

    public function run(): void
    {
        $church = $this->resolveChurch();
        if ($church === null) {
            $this->command?->error('Nenhuma igreja encontrada. Rode o ChurchSeeder antes.');

            return;
        }

        $replaceAll = $this->readOptionBool('replace-all');
        $creatorId = User::query()
            ->where('church_id', $church->id)
            ->orderBy('id')
            ->value('id');

        DB::transaction(function () use ($church, $creatorId, $replaceAll) {
            if ($replaceAll) {
                $pollIds = Poll::query()->where('church_id', $church->id)->pluck('id');
                if ($pollIds->isNotEmpty()) {
                    PollVote::query()->whereIn('poll_id', $pollIds)->delete();
                    PollOption::query()->whereIn('poll_id', $pollIds)->delete();
                    Poll::query()->whereIn('id', $pollIds)->delete();
                }
            }

            $questions = collect(self::POLLS)->pluck('question')->all();

            $existingIds = Poll::query()
                ->where('church_id', $church->id)
                ->whereIn('question', $questions)
                ->pluck('id');

            if ($existingIds->isNotEmpty()) {
                PollVote::query()->whereIn('poll_id', $existingIds)->delete();
            }

            foreach (self::POLLS as $item) {
                $poll = Poll::query()->firstOrNew([
                    'church_id' => $church->id,
                    'question' => $item['question'],
                ]);

                $poll->fill([
                    'created_by' => $poll->created_by ?: $creatorId,
                    'allow_multiple' => false,
                    'response_type' => $item['response_type'] ?? Poll::RESPONSE_CHOICE,
                    'status' => Poll::STATUS_OPEN,
                    'display_bg_color' => $poll->display_bg_color ?: '#0f172a',
                    'display_font' => $poll->display_font ?: 'sans',
                    'display_chart' => $poll->display_chart ?: 'bar',
                    'display_logo' => $poll->display_logo ?: 'horizontal-color',
                    'display_enabled' => ($item['response_type'] ?? Poll::RESPONSE_CHOICE) === Poll::RESPONSE_TEXT
                        ? false
                        : true,
                    // No feed unificado, só a primeira enquete de lançamento (milagre).
                    'publish_to_feed' => $item['question'] === 'Qual milagre de Jesus você gostaria de ter presenciado?',
                ]);
                $poll->save();
                $poll->ensurePublicToken();

                PollVote::query()->where('poll_id', $poll->id)->delete();
                PollOption::query()->where('poll_id', $poll->id)->delete();

                foreach ($item['options'] as $i => $label) {
                    PollOption::query()->create([
                        'poll_id' => $poll->id,
                        'label' => $label,
                        'sort_order' => $i,
                    ]);
                }
            }
        });

        $this->command?->info("Enquetes de lançamento prontas (0 votos) — igreja #{$church->id} ({$church->name}).");

        foreach (
            Poll::query()
                ->where('church_id', $church->id)
                ->whereIn('question', collect(self::POLLS)->pluck('question'))
                ->withCount('votes')
                ->orderBy('id')
                ->get() as $poll
        ) {
            $this->command?->line("- #{$poll->id} {$poll->question} ({$poll->votes_count} votos)");
            if ($poll->public_token) {
                $this->command?->line('  Votar: '.route('polls.vote', ['token' => $poll->public_token]));
                $this->command?->line('  Painel: '.route('polls.display', ['token' => $poll->public_token]));
            }
        }
    }

    private function resolveChurch(): ?Church
    {
        $opt = $this->readOptionString('church');
        if ($opt !== null && $opt !== '') {
            if (ctype_digit($opt)) {
                return Church::query()->find((int) $opt);
            }

            return Church::query()->where('slug', $opt)->first();
        }

        return Church::query()->where('slug', 'nova-semente')->first()
            ?? Church::query()->where('active', true)->orderBy('id')->first()
            ?? Church::query()->orderBy('id')->first();
    }

    private function readOptionString(string $name): ?string
    {
        if ($this->command === null || ! $this->command->getDefinition()->hasOption($name)) {
            return null;
        }

        $value = $this->command->option($name);

        return is_string($value) ? $value : null;
    }

    private function readOptionBool(string $name): bool
    {
        if ($this->command === null || ! $this->command->getDefinition()->hasOption($name)) {
            return false;
        }

        return (bool) $this->command->option($name);
    }
}
