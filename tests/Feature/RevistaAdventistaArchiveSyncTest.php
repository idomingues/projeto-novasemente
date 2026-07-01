<?php

namespace Tests\Feature;

use App\Models\RevistaAdventistaEdition;
use App\Models\User;
use App\Services\RevistaAdventistaArchiveCatalogService;
use App\Services\RevistaAdventistaArchiveSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RevistaAdventistaArchiveSyncTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return list<array<string, mixed>>
     */
    private function sampleEditions1906(): array
    {
        return [
            [
                'id_edicao' => 309,
                'ano' => 1906,
                'mes' => 'M01',
                'capa' => '1906_M01_web.jpg',
                'arquivo' => '1906_M01.pdf',
                'ativo' => true,
            ],
            [
                'id_edicao' => 310,
                'ano' => 1906,
                'mes' => 'M04',
                'capa' => '1906_M04_web.jpg',
                'arquivo' => '1906_M04.pdf',
                'ativo' => true,
            ],
        ];
    }

    public function test_map_edition_parses_month_and_urls(): void
    {
        $service = app(RevistaAdventistaArchiveSyncService::class);
        $mapped = $service->mapEdition($this->sampleEditions1906()[0]);

        $this->assertNotNull($mapped);
        $this->assertSame(309, $mapped['cpb_edition_id']);
        $this->assertSame(1906, $mapped['year']);
        $this->assertSame(1, $mapped['month']);
        $this->assertSame('Janeiro de 1906', $mapped['title']);
        $this->assertSame(
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg',
            $mapped['source_cover_url'],
        );
        $this->assertSame(
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf',
            $mapped['source_pdf_url'],
        );
    }

    public function test_sync_creates_editions_and_downloads_cover(): void
    {
        Storage::fake('public');

        Http::fake([
            RevistaAdventistaArchiveCatalogService::API_BASE.'/edicao*' => Http::response($this->sampleEditions1906(), 200),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg' => Http::response('cover-bytes', 200, ['Content-Type' => 'image/jpeg']),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M04_web.jpg' => Http::response('cover-bytes', 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906]);

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(2, $result['covers_downloaded']);

        $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', 309)->first();
        $this->assertNotNull($edition);
        $this->assertTrue($edition->hasLocalCover());
        Storage::disk('public')->assertExists((string) $edition->cover_path);
    }

    public function test_mobile_archive_lists_and_shows_edition(): void
    {
        $edition = RevistaAdventistaEdition::query()->create([
            'cpb_edition_id' => 309,
            'year' => 1906,
            'month_code' => 'M01',
            'month' => 1,
            'title' => 'Janeiro de 1906',
            'source_cover_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg',
            'source_pdf_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf',
            'is_active' => true,
            'synced_at' => now(),
        ]);

        $this->get(route('mobile.acervo-revista-adventista', ['ano' => 1906]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/RevistaAdventistaAcervo')
                ->has('editions', 1)
                ->where('selectedYear', 1906));

        $this->get(route('mobile.acervo-revista-adventista.show', $edition))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/RevistaAdventistaAcervoShow')
                ->where('edition.id', $edition->id)
                ->where('edition.title', 'Janeiro de 1906'));
    }

    public function test_admin_can_toggle_edition_active(): void
    {
        Permission::findOrCreate('news.manage');
        $user = User::factory()->create();
        $user->givePermissionTo('news.manage');

        $edition = RevistaAdventistaEdition::query()->create([
            'cpb_edition_id' => 309,
            'year' => 1906,
            'month_code' => 'M01',
            'month' => 1,
            'title' => 'Janeiro de 1906',
            'source_pdf_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf',
            'is_active' => true,
            'synced_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch(route('revista-adventista-acervo.edition.active', $edition), ['is_active' => false])
            ->assertRedirect();

        $this->assertFalse($edition->fresh()->is_active);

        $this->get(route('mobile.acervo-revista-adventista.show', $edition))
            ->assertNotFound();
    }
}
