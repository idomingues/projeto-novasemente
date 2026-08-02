<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\Poll;
use App\Models\User;
use App\Support\NewsLaunchDeepLinks;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicationsFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_any_authenticated_user_can_access_publications_feed_when_open(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'membro@example.com',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/PublicationsFeed')
                ->has('items.data')
                ->has('typeOptions')
                ->has('filters'));
    }

    public function test_guest_can_access_when_feed_is_open(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);

        $this->get(route('mobile.publications-feed'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Mobile/PublicationsFeed'));
    }

    public function test_preview_user_can_access_publications_feed(): void
    {
        config([
            'publications_feed.preview_only' => true,
            'publications_feed.preview_emails' => ['admin@example.com'],
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Mobile/PublicationsFeed')
                ->has('items.data')
                ->has('typeOptions')
                ->has('filters'));
    }

    public function test_other_user_gets_404_while_preview_only(): void
    {
        config([
            'publications_feed.preview_only' => true,
            'publications_feed.preview_emails' => ['admin@example.com'],
        ]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'membro@example.com',
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'))
            ->assertNotFound();
    }

    public function test_feed_returns_seeded_items_and_filters_by_type(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        $this->artisan('app:seed-publications-feed-demo', ['--church' => $church->slug])
            ->assertSuccessful();

        $response = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Mobile/PublicationsFeed')
            // Demo seed usa now(): todos no mês → primeira página traz o mês inteiro.
            ->where('items.data', fn ($items) => count($items) >= 10)
            ->where('items.has_more', false));

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'news']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.type', 'news')
                ->where('items.data', fn ($items) => collect($items)->every(fn ($item) => $item['type'] === 'news')));
    }

    public function test_feed_loads_next_page_via_json(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        // 15 notícias: 5 deste mês + 10 do mês passado → página 1 traz as 5 (mín. 10 com padding) = 10; página 2 o resto.
        for ($i = 1; $i <= 5; $i++) {
            News::query()->create([
                'church_id' => $church->id,
                'section' => News::SECTION_NEWS,
                'title' => "Notícia mês {$i}",
                'slug' => "noticia-mes-{$i}",
                'content_type' => News::TYPE_ARTICLE,
                'body' => 'Corpo',
                'published_at' => now()->subDays($i),
                'is_active' => true,
            ]);
        }
        for ($i = 1; $i <= 12; $i++) {
            News::query()->create([
                'church_id' => $church->id,
                'section' => News::SECTION_NEWS,
                'title' => "Notícia antiga {$i}",
                'slug' => "noticia-antiga-{$i}",
                'content_type' => News::TYPE_ARTICLE,
                'body' => 'Corpo',
                'published_at' => now()->subMonth()->subDays($i),
                'is_active' => true,
            ]);
        }

        $firstPage = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications-feed', ['page' => 1, 'type' => 'news']));

        $firstPage->assertOk()
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('has_more', true)
            ->assertJsonCount(10, 'data');

        $secondPage = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications-feed', ['page' => 2, 'type' => 'news']));

        $secondPage->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('has_more', false)
            ->assertJsonCount(7, 'data');
    }

    public function test_prayer_items_are_not_included_in_feed(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        \App\Models\PrayerRequest::query()->create([
            'church_id' => $church->id,
            'user_id' => $user->id,
            'request' => 'Texto secreto do pedido de oração',
            'name_or_nickname' => 'Jhimmy',
            'is_anonymous' => false,
            'active' => true,
            'needs_review' => false,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data', fn ($items) => collect($items)->every(
                    fn ($item) => ($item['type'] ?? null) !== 'prayer'
                ))
                ->where('typeOptions', fn ($options) => collect($options)->every(
                    fn ($option) => ($option['value'] ?? null) !== 'prayer'
                )));
    }

    public function test_news_item_links_to_detail_page(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_NEWS,
            'title' => 'Notícia do feed',
            'slug' => 'noticia-feed-teste',
            'content_type' => News::TYPE_ARTICLE,
            'body' => 'Corpo',
            'published_at' => now(),
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'news']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.href', route('mobile.news.show', ['news' => 'noticia-feed-teste'], absolute: false)));
    }

    public function test_ns_conecta_launch_news_links_to_module_not_detail(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'membro@example.com',
        ]);

        News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_NEWS,
            'title' => 'NS Conecta — comunicação entre a Nova Semente',
            'slug' => NewsLaunchDeepLinks::NS_CONECTA_SLUG,
            'content_type' => News::TYPE_INSTAGRAM_FEED,
            'body' => 'Toque em NS Conecta.',
            'image_url' => '/storage/news/ns-conecta-feed-arte-v2.png',
            'published_at' => now(),
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'news']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.href', route('mobile.ns-whats.index', absolute: false))
                ->where('items.data.0.action_label', 'Abrir NS Conecta')
                ->where('items.data.0.requires_open', true));

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.news.show', ['news' => NewsLaunchDeepLinks::NS_CONECTA_SLUG]))
            ->assertRedirect(route('mobile.ns-whats.index'));
    }

    public function test_open_poll_appears_in_publications_feed(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'membro@example.com',
        ]);

        $poll = Poll::query()->create([
            'church_id' => $church->id,
            'created_by' => $user->id,
            'question' => 'Qual sua preferência de culto?',
            'allow_multiple' => false,
            'response_type' => Poll::RESPONSE_CHOICE,
            'status' => Poll::STATUS_OPEN,
            'display_enabled' => true,
            'publish_to_feed' => true,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'polls']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.id', 'polls-'.$poll->id)
                ->where('items.data.0.type', 'polls')
                ->where('items.data.0.title', 'Qual sua preferência de culto?')
                ->where('items.data.0.href', route('mobile.polls.show', ['poll' => $poll->id], absolute: false)));
    }

    public function test_open_poll_without_feed_flag_is_hidden_from_publications_feed(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'membro@example.com',
        ]);

        Poll::query()->create([
            'church_id' => $church->id,
            'created_by' => $user->id,
            'question' => 'Enquete só interna',
            'allow_multiple' => false,
            'response_type' => Poll::RESPONSE_CHOICE,
            'status' => Poll::STATUS_OPEN,
            'display_enabled' => true,
            'publish_to_feed' => false,
        ]);

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'polls']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('items.data', []));
    }

    public function test_meditation_daily_example_appears_in_feed_with_overlay(): void
    {
        config(['publications_feed.preview_only' => false]);

        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        \Illuminate\Support\Facades\Http::fake([
            'api.openverse.org/*' => \Illuminate\Support\Facades\Http::response([
                'results' => [
                    ['url' => 'https://live.staticflickr.com/demo/sunrise-example.jpg'],
                ],
            ], 200),
            'live.staticflickr.com/*' => \Illuminate\Support\Facades\Http::response(str_repeat('JPEG', 800), 200, [
                'Content-Type' => 'image/jpeg',
            ]),
        ]);

        $this->artisan('app:publish-meditation-daily-feed-example', [
            '--church' => $church->slug,
            '--author' => $user->email,
        ])->assertSuccessful();

        $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.publications-feed', ['type' => 'meditation']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.type', 'meditation')
                ->where('items.data', function ($items) {
                    $items = collect($items);
                    if ($items->isEmpty()) {
                        return false;
                    }
                    $item = $items->first();

                    return $item['type'] === 'meditation'
                        && $item['type_label'] === 'Meditação diária'
                        && filled($item['cover_overlay_text'] ?? null)
                        && filled($item['cover_overlay_citation'] ?? null)
                        && filled($item['image_url'] ?? null);
                }));
    }

    public function test_guest_cannot_access_while_preview_only(): void
    {
        config([
            'publications_feed.preview_only' => true,
            'publications_feed.preview_emails' => ['admin@example.com'],
        ]);

        $this->seed(ChurchSeeder::class);

        $this->get(route('mobile.publications-feed'))
            ->assertNotFound();
    }
}
