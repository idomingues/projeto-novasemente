<?php

namespace App\Services;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use App\Support\ChurchAppFeatures;
use App\Support\DevotionalAudience;
use App\Support\MeditationDailyFeed;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class MeditationDailyFeedPublisher
{
    public function __construct(
        private readonly LibraryExternalPageExtractService $extractor,
        private readonly MeditationDailyCoverFetcher $covers,
    ) {}

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     skipped: int,
     *     failed: int,
     *     lines: list<string>
     * }
     */
    public function publishForDate(CarbonInterface $date, bool $force = false, ?Church $onlyChurch = null): array
    {
        $date = $date->copy()->timezone((string) config('app.timezone'))->startOfDay();
        $payload = $this->resolveDailyPayload();
        $cover = $this->covers->resolveForDate($date);
        $slug = MeditationDailyFeed::slugForDate($date);
        $publishedAt = $date->copy()->setTime(5, 0);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'failed' => 0,
            'lines' => [],
        ];

        foreach ($this->targetChurches($onlyChurch) as $church) {
            try {
                $result = $this->publishForChurch(
                    church: $church,
                    slug: $slug,
                    payload: $payload,
                    cover: $cover,
                    publishedAt: $publishedAt,
                    force: $force,
                );
                $stats[$result['status']]++;
                $stats['lines'][] = $result['line'];
            } catch (\Throwable $e) {
                $stats['failed']++;
                $stats['lines'][] = "Falha {$church->slug}: ".$e->getMessage();
                Log::warning('meditation_daily_feed.publish_failed', [
                    'church_id' => $church->id,
                    'slug' => $slug,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $stats;
    }

    /**
     * @return array{title: string, verse: string, citation: string, body: string}
     */
    public function resolveDailyPayload(): array
    {
        $url = DevotionalAudience::defaultUrl(DevotionalAudience::ADULTOS);
        $result = $this->extractor->fetchAndExtract($url, 'meditation');
        if (! empty($result['ok']) && is_string($result['html'] ?? null) && trim((string) $result['html']) !== '') {
            return MeditationDailyFeed::extractFromMeditationHtml((string) $result['html']);
        }

        Log::notice('meditation_daily_feed.cpb_fallback', [
            'error' => $result['error'] ?? 'html_vazio',
        ]);

        return MeditationDailyFeed::examplePayload();
    }

    /**
     * @param  array{title: string, verse: string, citation: string, body: string}  $payload
     * @return array{status: 'created'|'updated'|'skipped', line: string}
     */
    private function publishForChurch(
        Church $church,
        string $slug,
        array $payload,
        string $cover,
        CarbonInterface $publishedAt,
        bool $force,
    ): array {
        $existing = News::query()
            ->where('church_id', $church->id)
            ->where('slug', $slug)
            ->first();

        if ($existing !== null && ! $force) {
            return [
                'status' => 'skipped',
                'line' => "Já existe {$church->slug} · {$slug} (#{$existing->id})",
            ];
        }

        $author = $this->resolveAuthor($church);
        $body = MeditationDailyFeed::encodeBody(
            $payload['verse'],
            $payload['citation'],
            $payload['body'],
        );

        $news = News::query()->updateOrCreate(
            [
                'church_id' => $church->id,
                'slug' => $slug,
            ],
            [
                'section' => News::SECTION_NEWS,
                'title' => $payload['title'] !== '' ? $payload['title'] : 'Meditação diária',
                'content_type' => News::TYPE_IMAGE,
                'excerpt' => $payload['verse'],
                'body' => $body,
                'image_url' => $cover,
                'published_at' => $publishedAt,
                'is_active' => true,
                'created_by' => $author?->id ?? $existing?->created_by,
            ],
        );

        $wasRecentlyCreated = $news->wasRecentlyCreated;

        return [
            'status' => $wasRecentlyCreated ? 'created' : 'updated',
            'line' => ($wasRecentlyCreated ? 'Criado' : 'Atualizado')." {$church->slug} · {$slug} (#{$news->id})",
        ];
    }

    /**
     * @return Collection<int, Church>
     */
    private function targetChurches(?Church $onlyChurch): Collection
    {
        if ($onlyChurch !== null) {
            return collect([$onlyChurch]);
        }

        return Church::query()
            ->where('active', true)
            ->orderBy('id')
            ->get()
            ->filter(fn (Church $church) => ChurchAppFeatures::isEnabled($church, 'devotional'))
            ->values();
    }

    private function resolveAuthor(Church $church): ?User
    {
        return User::query()
            ->where('church_id', $church->id)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'super_admin']))
            ->orderBy('id')
            ->first()
            ?? User::query()->orderBy('id')->first();
    }
}
