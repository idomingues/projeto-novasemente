<?php

namespace Tests\Feature;

use App\Models\RevistaAdventistaArticle;
use App\Services\RevistaAdventistaSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RevistaAdventistaSyncTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function sampleWpPost(int $id = 41127, array $categories = [44, 88]): array
    {
        return [
            'id' => $id,
            'slug' => 'intimidade-sagrada',
            'link' => 'https://revistaadventista.com.br/a-redacao/artigos/intimidade-sagrada/',
            'date' => '2026-06-25T07:00:00',
            'date_gmt' => '2026-06-25T10:00:00',
            'modified' => '2026-06-01T10:49:17',
            'modified_gmt' => '2026-06-01T13:49:17',
            'title' => ['rendered' => 'Intimidade sagrada'],
            'excerpt' => ['rendered' => '<p>É permitido ter relação sexual no sábado?</p>'],
            'content' => ['rendered' => '<p><strong>Clinton Wahlen</strong></p><p>Conteúdo do artigo.</p>'],
            'categories' => $categories,
            '_embedded' => [
                'author' => [['name' => 'A Redação']],
                'wp:featuredmedia' => [['source_url' => 'https://revistaadventista.com.br/wp-content/uploads/cover.jpg']],
            ],
        ];
    }

    public function test_resolve_section_prioritizes_bussola_over_artigos(): void
    {
        $service = app(RevistaAdventistaSyncService::class);

        $this->assertSame(
            RevistaAdventistaArticle::SECTION_BUSSOLA,
            $service->resolveSection([44, 88, 46]),
        );
        $this->assertSame(
            RevistaAdventistaArticle::SECTION_EDITORIAL,
            $service->resolveSection([44, 79]),
        );
    }

    public function test_sync_creates_and_updates_articles_from_wp_api(): void
    {
        $round = 0;

        Http::fake(function ($request) use (&$round) {
            $category = (int) ($request->data()['categories'] ?? 0);
            if ($category !== RevistaAdventistaSyncService::WP_CATEGORY_IDS[RevistaAdventistaArticle::SECTION_ARTIGOS]) {
                return Http::response([], 200);
            }

            $post = $this->sampleWpPost();
            if ($round >= 1) {
                $post['title']['rendered'] = 'Intimidade sagrada (atualizado)';
            }

            return Http::response([$post], 200);
        });

        $result = app(RevistaAdventistaSyncService::class)->sync([2026]);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['created']);
        $this->assertSame(0, $result['updated']);

        $article = RevistaAdventistaArticle::query()->where('wp_post_id', 41127)->first();
        $this->assertNotNull($article);
        $this->assertSame('Intimidade sagrada', $article->title);
        $this->assertSame(RevistaAdventistaArticle::SECTION_BUSSOLA, $article->section);
        $this->assertSame('A Redação', $article->author_name);

        $round = 1;

        $again = app(RevistaAdventistaSyncService::class)->sync([2026]);
        $this->assertTrue($again['ok']);
        $this->assertSame(0, $again['created']);
        $this->assertSame(1, $again['updated']);
        $this->assertSame('Intimidade sagrada (atualizado)', $article->fresh()->title);
    }
}
