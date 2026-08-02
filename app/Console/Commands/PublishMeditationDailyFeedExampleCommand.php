<?php

namespace App\Console\Commands;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use App\Services\MeditationDailyCoverFetcher;
use App\Support\MeditationDailyFeed;
use Illuminate\Console\Attributes\AsCommand;
use Illuminate\Console\Command;

#[AsCommand(
    name: 'app:publish-meditation-daily-feed-example',
    description: 'Publica um exemplo do feed Meditação diária (capa Unsplash + versículo)',
)]
class PublishMeditationDailyFeedExampleCommand extends Command
{
    protected $signature = 'app:publish-meditation-daily-feed-example
                            {--church=nova-semente : Slug ou ID da igreja}
                            {--author= : E-mail do autor (padrão: admin da igreja)}';

    public function handle(MeditationDailyCoverFetcher $covers): int
    {
        $church = $this->resolveChurch();
        if ($church === null) {
            $this->error('Nenhuma igreja encontrada.');

            return self::FAILURE;
        }

        $author = $this->resolveAuthor($church);
        if ($author === null) {
            $this->error('Nenhum autor encontrado. Informe --author=email.');

            return self::FAILURE;
        }

        $payload = MeditationDailyFeed::examplePayload();
        $today = now();
        $cover = $covers->resolveForDate($today);
        $body = MeditationDailyFeed::encodeBody(
            $payload['verse'],
            $payload['citation'],
            $payload['body'],
        );

        $news = News::query()->updateOrCreate(
            [
                'church_id' => $church->id,
                'slug' => MeditationDailyFeed::EXAMPLE_SLUG,
            ],
            [
                'section' => News::SECTION_NEWS,
                'title' => $payload['title'],
                'content_type' => News::TYPE_IMAGE,
                'excerpt' => $payload['verse'],
                'body' => $body,
                'image_url' => $cover,
                'published_at' => $today->copy()->startOfDay()->setTime(6, 0),
                'is_active' => true,
                'created_by' => $author->id,
            ],
        );

        $this->info("Igreja: {$church->name} (#{$church->id})");
        $this->info("Feed Meditação diária — news #{$news->id} · {$news->slug}");
        $this->info('Capa: '.$cover);
        $this->info('Versículo: '.$payload['citation'].' — '.$payload['verse']);
        $this->comment('Abra o app na aba Publicações.');
        $this->comment('Job diário: app:publish-meditation-daily-feed às 05:00.');

        return self::SUCCESS;
    }

    private function resolveChurch(): ?Church
    {
        $raw = trim((string) $this->option('church'));
        if ($raw === '') {
            return Church::query()->where('active', true)->orderBy('id')->first();
        }

        if (ctype_digit($raw)) {
            return Church::query()->find((int) $raw);
        }

        return Church::query()->where('slug', $raw)->first()
            ?? Church::query()->where('active', true)->orderBy('id')->first();
    }

    private function resolveAuthor(Church $church): ?User
    {
        $email = $this->option('author');
        if (is_string($email) && trim($email) !== '') {
            return User::query()->where('email', trim($email))->first();
        }

        return User::query()
            ->where('church_id', $church->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();
    }
}
