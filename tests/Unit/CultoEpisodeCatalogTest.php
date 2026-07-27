<?php

namespace Tests\Unit;

use App\Models\Culto;
use App\Support\CultoEpisodeCatalog;
use Tests\TestCase;

class CultoEpisodeCatalogTest extends TestCase
{
    public function test_series_key_from_episode_title(): void
    {
        $this->assertSame(
            'sem filtro',
            CultoEpisodeCatalog::seriesKey('Sem Filtro, Ep. 8 | Onde estão os teus acusadores?'),
        );
    }

    public function test_filter_to_current_series_uses_first_in_ordered_list(): void
    {
        $latest = new Culto([
            'title' => 'Sem Filtro, Ep. 8 | Título',
            'youtube_url' => 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        ]);
        $sameSeries = new Culto([
            'title' => 'Sem Filtro, Ep. 1 | Antigo',
            'youtube_url' => 'https://www.youtube.com/watch?v=bbbbbbbbbbb',
        ]);
        $otherSeries = new Culto([
            'title' => 'Outra Série, Ep. 2 | X',
            'youtube_url' => 'https://www.youtube.com/watch?v=ccccccccccc',
        ]);

        $filtered = CultoEpisodeCatalog::filterToCurrentSeries(collect([$latest, $sameSeries, $otherSeries]));

        $this->assertCount(2, $filtered);
        $this->assertTrue($filtered->contains(fn (Culto $c) => $c->title === $latest->title));
        $this->assertTrue($filtered->contains(fn (Culto $c) => $c->title === $sameSeries->title));
    }

    public function test_dedupe_by_youtube_video_keeps_newest_id(): void
    {
        $older = new Culto([
            'youtube_url' => 'https://www.youtube.com/watch?v=duplicate11',
            'title' => 'Ep. 1',
        ]);
        $older->id = 1;

        $newer = new Culto([
            'youtube_url' => 'https://youtu.be/duplicate11',
            'title' => 'Ep. 1 duplicado',
        ]);
        $newer->id = 2;

        $deduped = CultoEpisodeCatalog::dedupeByYoutubeVideo(collect([$older, $newer]));

        $this->assertCount(1, $deduped);
        $this->assertSame(2, $deduped->first()->id);
    }
}
