<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class NewsIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_instagram_feed_post_appears_in_news_index(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('news.store'), [
                'content_type' => News::TYPE_INSTAGRAM_FEED,
                'title' => 'Publicação Instagram Teste',
                'body' => 'Legenda da publicação',
                'image_url' => 'https://example.com/capa-instagram.jpg',
                'published_at' => now()->format('Y-m-d\TH:i'),
            ])
            ->assertRedirect(route('news.index', [
                'modal' => 'edit',
                'id' => News::query()->where('title', 'Publicação Instagram Teste')->value('id'),
            ]));

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('news.index'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $rows = $page['props']['posts']['data'] ?? [];
        $row = collect($rows)->firstWhere('title', 'Publicação Instagram Teste');

        $this->assertNotNull($row);
        $this->assertSame(News::TYPE_INSTAGRAM_FEED, $row['content_type']);
    }
}
