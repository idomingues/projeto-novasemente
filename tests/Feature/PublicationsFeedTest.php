<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use Database\Seeders\ChurchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PublicationsFeedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'publications_feed.preview_only' => true,
            'publications_feed.preview_emails' => ['admin@example.com'],
        ]);
    }

    public function test_preview_user_can_access_publications_feed(): void
    {
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
            ->where('items.data', fn ($items) => count($items) === 10)
            ->where('items.has_more', true));

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
        $this->seed(ChurchSeeder::class);
        $church = Church::query()->firstOrFail();

        $user = User::factory()->create([
            'church_id' => $church->id,
            'email' => 'admin@example.com',
        ]);

        $this->artisan('app:seed-publications-feed-demo', ['--church' => $church->slug])
            ->assertSuccessful();

        $firstPage = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications-feed', ['page' => 1]));

        $firstPage->assertOk()
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('has_more', true)
            ->assertJsonCount(10, 'data');

        $secondPage = $this->actingAs($user)
            ->withSession(['working_church_id' => $church->id])
            ->getJson(route('mobile.publications-feed', ['page' => 2]));

        $secondPage->assertOk()
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('has_more', false)
            ->assertJsonCount(3, 'data');
    }

    public function test_prayer_item_does_not_expose_request_content_in_feed(): void
    {
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
            ->get(route('mobile.publications-feed', ['type' => 'prayer']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('items.data.0.title', 'Alguém precisa da sua oração')
                ->where('items.data.0.excerpt', '')
                ->where('items.data.0.meta', []));
    }

    public function test_news_item_links_to_detail_page(): void
    {
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

    public function test_guest_cannot_access_while_preview_only(): void
    {
        $this->seed(ChurchSeeder::class);

        $this->get(route('mobile.publications-feed'))
            ->assertNotFound();
    }
}
