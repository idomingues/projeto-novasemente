<?php

namespace App\Services;

use App\Models\Church;
use App\Models\News;
use App\Models\WeeklyProgram;
use App\Support\ChurchAppFeatures;
use App\Support\MeditationDailyFeed;
use Carbon\Carbon;

class MeditationHomeBannerService
{
    /**
     * Banner da home para estimular a leitura da meditação do dia.
     * Visível desde a publicação até as 10:00 (fuso da igreja).
     *
     * @return array<string, mixed>|null
     */
    public function homeBannerPayload(?Church $church): ?array
    {
        if (! ChurchAppFeatures::isEnabled($church, 'devotional')) {
            return null;
        }

        $timezone = (string) config('meditation.timezone', config('app.timezone', 'America/Sao_Paulo'));
        $now = Carbon::now($timezone);
        $preview = $this->isPreviewEnabled();
        $untilHour = (int) config('meditation.home_banner_until_hour', 10);

        if (! $preview && $now->hour >= $untilHour) {
            return null;
        }

        $post = $this->resolvePost($church, $now, $preview);
        if ($post === null) {
            return $preview ? $this->payloadFromExample($now) : null;
        }

        return $this->payloadFromPost($post, $now);
    }

    private function isPreviewEnabled(): bool
    {
        if ((bool) config('meditation.home_banner_preview')) {
            return true;
        }

        return app()->environment('local');
    }

    private function resolvePost(?Church $church, Carbon $now, bool $preview): ?News
    {
        $today = $this->todaysPublishedPost($church, $now);
        if ($today !== null) {
            return $today;
        }

        if (! $preview) {
            return null;
        }

        return $this->latestPublishedPost($church);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFromPost(News $post, Carbon $now): array
    {
        $parsed = MeditationDailyFeed::parseStoredBody($post->body, $post->excerpt);
        $title = trim((string) $post->title);
        if ($title === '' || strcasecmp($title, 'Meditação diária') === 0) {
            $title = 'Meditação de hoje';
        }

        $verse = trim($parsed['verse']);
        if ($verse === '') {
            $verse = 'Reserve um momento para ler a meditação de hoje.';
        }

        $citation = trim($parsed['citation']);

        return $this->payload($title, $verse, $citation, $now);
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadFromExample(Carbon $now): array
    {
        $example = MeditationDailyFeed::examplePayload();

        return $this->payload(
            $example['title'] !== '' ? $example['title'] : 'Meditação de hoje',
            $example['verse'],
            $example['citation'],
            $now,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(string $title, string $verse, string $citation, Carbon $now): array
    {
        $dayName = WeeklyProgram::dayName((int) $now->dayOfWeek);

        return [
            'title' => $title,
            'subtitle' => 'Meditação diária',
            'verse' => $verse,
            'citation' => $citation,
            'day_label' => $dayName !== '' ? $dayName : 'Hoje',
            'message' => 'Comece o dia com Deus.',
            'cta' => 'Ler meditação',
            'image_url' => (string) config('meditation.banner_image', '/images/sabbath-sunset-bg.jpg'),
        ];
    }

    private function todaysPublishedPost(?Church $church, Carbon $now): ?News
    {
        if ($church === null) {
            return null;
        }

        return News::query()
            ->where('church_id', $church->id)
            ->where('slug', MeditationDailyFeed::slugForDate($now))
            ->visibleToPublic()
            ->first();
    }

    private function latestPublishedPost(?Church $church): ?News
    {
        $query = News::query()
            ->where('slug', 'like', MeditationDailyFeed::SLUG_PREFIX.'%')
            ->visibleToPublic()
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if ($church !== null) {
            $query->where('church_id', $church->id);
        }

        return $query->first();
    }
}
