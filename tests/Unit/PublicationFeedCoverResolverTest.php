<?php

namespace Tests\Unit;

use App\Models\AcervoItem;
use App\Models\CharityCampaign;
use App\Models\Event;
use App\Models\News;
use App\Support\PublicationFeedCoverResolver;
use Tests\TestCase;

class PublicationFeedCoverResolverTest extends TestCase
{
    public function test_event_cover_uses_absolute_image_url(): void
    {
        $event = new Event([
            'image_url' => '/storage/events/capa.jpg',
            'video_type' => null,
        ]);

        $cover = PublicationFeedCoverResolver::forEvent($event, 'https://app.test');

        $this->assertSame('https://app.test/storage/events/capa.jpg', $cover);
    }

    public function test_event_cover_falls_back_to_youtube_thumbnail(): void
    {
        $event = new Event([
            'image_url' => null,
            'video_type' => Event::VIDEO_YOUTUBE,
            'video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        $cover = PublicationFeedCoverResolver::forEvent($event, 'https://app.test');

        $this->assertSame('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', $cover);
    }

    public function test_charity_campaign_cover_falls_back_to_story_video_thumbnail(): void
    {
        $campaign = new CharityCampaign([
            'cover_image_path' => null,
            'story_video_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        $cover = PublicationFeedCoverResolver::forCharityCampaign($campaign, null, 'https://app.test');

        $this->assertSame('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', $cover);
    }

    public function test_acervo_cover_falls_back_to_youtube_url(): void
    {
        $item = new AcervoItem([
            'thumbnail_url' => null,
            'url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        ]);

        $cover = PublicationFeedCoverResolver::forAcervo($item, null, 'https://app.test');

        $this->assertSame('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg', $cover);
    }
}
