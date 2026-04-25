<?php

namespace Tests\Unit;

use App\Models\Musica;
use Tests\TestCase;

class MusicaYoutubeHelpersTest extends TestCase
{
    public function test_youtube_playlist_id_from_playlist_url(): void
    {
        $this->assertSame(
            'PL2kd2685Ul2kEDe01Ye019x0HolNv0JHx',
            Musica::youtubePlaylistIdFromUrl('https://www.youtube.com/playlist?list=PL2kd2685Ul2kEDe01Ye019x0HolNv0JHx')
        );
    }

    public function test_youtube_playlist_id_from_watch_url_with_list(): void
    {
        $this->assertSame(
            'PLxyz0123456789',
            Musica::youtubePlaylistIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz0123456789&index=1')
        );
    }

    public function test_youtube_playlist_id_returns_null_without_list(): void
    {
        $this->assertNull(Musica::youtubePlaylistIdFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    }

    public function test_canonical_youtube_watch_url(): void
    {
        $this->assertSame(
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            Musica::canonicalYoutubeWatchUrl('dQw4w9WgXcQ')
        );
    }
}
