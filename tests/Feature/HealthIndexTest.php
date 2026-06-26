<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\News;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_health_article_accepts_excerpt_up_to_500_characters(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $excerpt = str_repeat('a', 500);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('health.store'), [
                'content_type' => News::TYPE_ARTICLE,
                'title' => 'Artigo com resumo longo',
                'excerpt' => $excerpt,
                'body' => 'Conteúdo do artigo.',
            ])
            ->assertRedirect();

        $this->assertSame($excerpt, News::query()->where('title', 'Artigo com resumo longo')->value('excerpt'));
    }

    public function test_health_pdf_truncates_excerpt_over_500_characters_on_save(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $longExcerpt = str_repeat('a', 620);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('health.store'), [
                'content_type' => News::TYPE_PDF,
                'title' => 'PDF com apresentação longa',
                'excerpt' => $longExcerpt,
                'body' => str_repeat('b', 1000),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['excerpt']);
    }

    public function test_health_pdf_store_with_file_and_excerpt(): void
    {
        Storage::fake('public');
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $pdf = UploadedFile::fake()->create('Artigo Blue Zone.pdf', 2400, 'application/pdf');
        $excerpt = str_repeat('a', 400);

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->post(route('health.store'), [
                'content_type' => News::TYPE_PDF,
                'title' => 'O Grande Blefe do Século: O que a Ciência Descobriu sobre a Terra dos Centenários?',
                'excerpt' => $excerpt,
                'body' => '',
                'pdf_file' => $pdf,
            ])
            ->assertRedirect();

        $news = News::query()->where('title', 'like', 'O Grande Blefe do Século%')->first();
        $this->assertNotNull($news);
        $this->assertSame(News::TYPE_PDF, $news->content_type);
        $this->assertSame($excerpt, $news->excerpt);
        $this->assertNotNull($news->pdf_path);
    }

    public function test_health_pdf_rejects_excerpt_over_500_characters(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $pdf = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('health.store'), [
                'content_type' => News::TYPE_PDF,
                'title' => 'PDF com apresentação longa',
                'excerpt' => str_repeat('a', 501),
                'body' => '',
                'pdf_file' => $pdf,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['excerpt']);
    }

    public function test_health_store_returns_json_redirect_for_fetch_save(): void
    {
        $this->seed();

        $church = Church::query()->firstOrFail();
        Permission::firstOrCreate(['name' => 'news.manage']);
        $admin = User::factory()->create(['church_id' => $church->id]);
        $admin->assignRole(Role::firstOrCreate(['name' => 'admin']));
        $admin->givePermissionTo('news.manage');

        $pdf = UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf');

        $response = $this->actingAs($admin)
            ->withSession(['working_church_id' => $church->id])
            ->postJson(route('health.store'), [
                'content_type' => News::TYPE_PDF,
                'title' => 'PDF via fetch JSON',
                'excerpt' => 'Apresentação curta',
                'body' => '',
                'pdf_file' => $pdf,
            ]);

        $news = News::query()->where('title', 'PDF via fetch JSON')->first();
        $this->assertNotNull($news);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Publicação de saúde criada com sucesso.')
            ->assertJsonPath('redirect', route('health.index', [
                'modal' => 'edit',
                'id' => $news->id,
            ]));
    }

    public function test_health_article_rejects_body_over_limit(): void
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
                'title' => 'Artigo longo demais',
                'body' => str_repeat('a', 65001),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['body']);
    }
}
