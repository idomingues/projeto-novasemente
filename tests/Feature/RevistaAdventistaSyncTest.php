<?php

namespace Tests\Feature;

use App\Models\RevistaAdventistaArticle;
use App\Models\User;
use App\Services\RevistaAdventistaSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
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

    public function test_mobile_list_and_show_render_imported_article(): void
    {
        $article = RevistaAdventistaArticle::query()->create([
            'wp_post_id' => 999,
            'title' => 'Artigo de teste',
            'slug' => 'artigo-de-teste',
            'excerpt' => 'Resumo curto.',
            'body' => '<p>Corpo do artigo.</p>',
            'author_name' => 'A Redação',
            'source_url' => 'https://revistaadventista.com.br/artigo-de-teste/',
            'image_url' => 'https://revistaadventista.com.br/cover.jpg',
            'section' => RevistaAdventistaArticle::SECTION_ARTIGOS,
            'published_at' => now()->subDay(),
            'synced_at' => now(),
        ]);

        $this->get(route('mobile.revista-adventista'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/RevistaAdventista')
                ->has('articles.data', 1)
                ->where('articles.data.0.title', 'Artigo de teste'));

        $this->get(route('mobile.revista-adventista.show', $article->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/RevistaAdventistaShow')
                ->where('article.title', 'Artigo de teste')
                ->where('article.body', '<p>Corpo do artigo.</p>'));
    }

    public function test_mobile_list_search_filters_by_title_excerpt_body_and_author(): void
    {
        RevistaAdventistaArticle::query()->create([
            'wp_post_id' => 1001,
            'title' => 'Vitaminas B',
            'slug' => 'vitaminas-b',
            'excerpt' => 'Saúde e bem-estar.',
            'body' => '<p>Texto sobre nutrientes.</p>',
            'author_name' => 'Débora Borges',
            'source_url' => 'https://revistaadventista.com.br/vitaminas-b/',
            'section' => RevistaAdventistaArticle::SECTION_ARTIGOS,
            'published_at' => now()->subDay(),
            'synced_at' => now(),
        ]);

        RevistaAdventistaArticle::query()->create([
            'wp_post_id' => 1002,
            'title' => 'Outro tema',
            'slug' => 'outro-tema',
            'excerpt' => 'Resumo diferente.',
            'body' => '<p>Conteúdo sem relação.</p>',
            'author_name' => 'A Redação',
            'source_url' => 'https://revistaadventista.com.br/outro-tema/',
            'section' => RevistaAdventistaArticle::SECTION_ARTIGOS,
            'published_at' => now()->subDays(2),
            'synced_at' => now(),
        ]);

        $this->get(route('mobile.revista-adventista', ['q' => 'vitaminas']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('articles.data', 1)
                ->where('articles.data.0.title', 'Vitaminas B')
                ->where('filters.q', 'vitaminas'));

        $this->get(route('mobile.revista-adventista', ['q' => 'Débora']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('articles.data', 1));

        $this->get(route('mobile.revista-adventista', ['q' => 'nutrientes']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('articles.data', 1));
    }

    public function test_inactive_article_hidden_from_mobile_and_admin_can_toggle(): void
    {
        Permission::firstOrCreate(['name' => 'news.manage']);
        Permission::firstOrCreate(['name' => 'news.view']);

        $admin = User::factory()->create();
        $admin->givePermissionTo(['news.manage', 'news.view']);

        $article = RevistaAdventistaArticle::query()->create([
            'wp_post_id' => 2001,
            'title' => 'Artigo para desativar',
            'slug' => 'artigo-para-desativar',
            'excerpt' => 'Resumo.',
            'body' => '<p>Corpo.</p>',
            'author_name' => 'A Redação',
            'source_url' => 'https://revistaadventista.com.br/artigo/',
            'section' => RevistaAdventistaArticle::SECTION_ARTIGOS,
            'published_at' => now()->subDay(),
            'synced_at' => now(),
            'is_active' => true,
        ]);

        $this->actingAs($admin)
            ->get(route('revista-adventista.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('RevistaAdventista/Index')
                ->where('articles.data.0.is_active', true));

        $this->actingAs($admin)
            ->patch(route('revista-adventista.active', $article), ['is_active' => false])
            ->assertRedirect();

        $this->assertFalse($article->fresh()->is_active);

        $this->get(route('mobile.revista-adventista'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('articles.data', 0));

        $this->get(route('mobile.revista-adventista.show', $article->slug))
            ->assertNotFound();
    }
}
