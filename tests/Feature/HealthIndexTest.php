<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class HealthIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_created_health_article_appears_in_health_index(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('health.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Primeiro artigo de saúde',
                'excerpt' => 'Resumo do artigo',
                'body' => "Conteúdo do artigo enviado pelo Fernando.\n\nSegundo parágrafo.",
                'published_at' => now()->format('Y-m-d\TH:i'),
            ])
            ->assertRedirect(route('health.index', [
                'modal' => 'edit',
                'id' => News::query()
                    ->where('title', 'Primeiro artigo de saúde')
                    ->where('section', News::SECTION_HEALTH)
                    ->value('id'),
            ]));

        $news = News::query()
            ->where('title', 'Primeiro artigo de saúde')
            ->first();

        $this->assertNotNull($news);
        $this->assertSame(News::SECTION_HEALTH, $news->section);
        $this->assertSame(News::TYPE_ARTICLE, $news->content_type);

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->get(route('health.index'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $rows = $page['props']['posts']['data'] ?? [];
        $row = collect($rows)->firstWhere('title', 'Primeiro artigo de saúde');

        $this->assertNotNull($row);
        $this->assertSame(News::TYPE_ARTICLE, $row['content_type']);
    }

    public function test_health_article_requires_body(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('health.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Artigo sem corpo',
                'body' => '',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['body']);
    }

    public function test_health_article_visible_on_mobile_when_active(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();

        News::query()->create([
            'church_id' => $church->id,
            'section' => News::SECTION_HEALTH,
            'title' => 'Artigo saúde app',
            'slug' => 'artigo-saude-app',
            'content_type' => News::TYPE_ARTICLE,
            'body' => 'Conteúdo visível no app.',
            'published_at' => now()->subHour(),
            'is_active' => true,
        ]);

        $response = $this->withSession(['working_church_id' => $church->id])
            ->get(route('mobile.health'));

        $response->assertOk();
        $page = json_decode(json_encode($response->viewData('page')), true);
        $rows = $page['props']['posts']['data'] ?? [];
        $row = collect($rows)->firstWhere('title', 'Artigo saúde app');

        $this->assertNotNull($row);
    }
}
