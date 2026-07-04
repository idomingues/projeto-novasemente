<?php

namespace Tests\Feature;

use App\Models\RevistaAdventistaEdition;
use App\Models\User;
use App\Services\RevistaAdventistaAcesArchiveCatalogService;
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

    /**
     * @return list<array<string, mixed>>
     */
    private function sampleAcesPosts1906(): array
    {
        return [
            [
                'id' => 5001,
                'date' => '1906-01-01T00:00:00',
                'slug' => 'ra-1906-01',
                'title' => ['rendered' => 'RA-1906-01'],
                'jetpack_featured_media_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.jpg',
            ],
            [
                'id' => 5002,
                'date' => '1906-02-01T00:00:00',
                'slug' => 'ra-1906-02',
                'title' => ['rendered' => 'RA-1906-02'],
                'jetpack_featured_media_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/02/ra_1906_02.jpg',
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function sampleAcesMedia1906(): array
    {
        return [
            [
                'id' => 7001,
                'slug' => 'ra_1906_01',
                'title' => ['rendered' => 'ra_1906_01'],
                'mime_type' => 'application/pdf',
                'media_type' => 'file',
                'source_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.pdf',
                'post' => null,
            ],
            [
                'id' => 7002,
                'slug' => 'ra_1906_01-capa',
                'title' => ['rendered' => 'ra_1906_01'],
                'mime_type' => 'image/jpeg',
                'media_type' => 'image',
                'source_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.jpg',
                'post' => null,
            ],
            [
                'id' => 7003,
                'slug' => 'ra_1906_02',
                'title' => ['rendered' => 'ra_1906_02'],
                'mime_type' => 'application/pdf',
                'media_type' => 'file',
                'source_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/02/ra_1906_02.pdf',
                'post' => null,
            ],
            [
                'id' => 7004,
                'slug' => 'ra_1906_02-capa',
                'title' => ['rendered' => 'ra_1906_02'],
                'mime_type' => 'image/jpeg',
                'media_type' => 'image',
                'source_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/02/ra_1906_02.jpg',
                'post' => null,
            ],
        ];
    }

    public function test_map_edition_parses_month_and_urls(): void
    {
        $service = app(RevistaAdventistaArchiveSyncService::class);
        $mapped = $service->mapEdition($this->sampleEditions1906()[0]);

        $this->assertNotNull($mapped);
        $this->assertSame(RevistaAdventistaEdition::SOURCE_CPB, $mapped['source']);
        $this->assertSame('309', $mapped['source_edition_id']);
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
            RevistaAdventistaAcesArchiveCatalogService::API_BASE.'/categories*' => Http::response([], 200),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906]);

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(2, $result['covers_downloaded']);

        $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', 309)->first();
        $this->assertNotNull($edition);
        $this->assertTrue($edition->hasLocalCover());
        $this->assertSame(RevistaAdventistaEdition::SOURCE_CPB, $edition->source);
        $this->assertSame('309', $edition->source_edition_id);
        Storage::disk('public')->assertExists((string) $edition->cover_path);
    }

    public function test_sync_imports_aces_only_for_missing_months(): void
    {
        Storage::fake('public');

        Http::fake([
            RevistaAdventistaArchiveCatalogService::API_BASE.'/edicao*' => Http::response([$this->sampleEditions1906()[0]], 200),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg' => Http::response('cpb-cover', 200, ['Content-Type' => 'image/jpeg']),
            RevistaAdventistaAcesArchiveCatalogService::API_BASE.'/categories*' => Http::response([
                ['id' => 1906, 'name' => '1906', 'slug' => '1906', 'count' => 2],
            ], 200, ['X-WP-TotalPages' => '1']),
            RevistaAdventistaAcesArchiveCatalogService::API_BASE.'/posts*' => Http::response($this->sampleAcesPosts1906(), 200),
            RevistaAdventistaAcesArchiveCatalogService::API_BASE.'/media*' => Http::response($this->sampleAcesMedia1906(), 200),
            'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/02/ra_1906_02.jpg' => Http::response('aces-cover', 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906]);

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(1, $result['skipped']);

        $january = RevistaAdventistaEdition::query()->where('year', 1906)->where('month', 1)->first();
        $february = RevistaAdventistaEdition::query()->where('year', 1906)->where('month', 2)->first();

        $this->assertNotNull($january);
        $this->assertNotNull($february);
        $this->assertSame(RevistaAdventistaEdition::SOURCE_CPB, $january->source);
        $this->assertSame(RevistaAdventistaEdition::SOURCE_ACES, $february->source);
        $this->assertSame('5002', $february->source_edition_id);
        $this->assertSame(
            'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/02/ra_1906_02.pdf',
            $february->source_pdf_url
        );
    }

    public function test_sync_replaces_existing_aces_month_when_cpb_becomes_available(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('revista-adventista/pdfs/1906_M01.pdf', 'old-aces-pdf');
        Storage::disk('public')->put('revista-adventista/covers/1906_M01.jpg', 'old-aces-cover');

        $edition = RevistaAdventistaEdition::query()->create([
            'source' => RevistaAdventistaEdition::SOURCE_ACES,
            'source_edition_id' => '5001',
            'cpb_edition_id' => null,
            'year' => 1906,
            'month_code' => 'M01',
            'month' => 1,
            'title' => 'Janeiro de 1906',
            'source_cover_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.jpg',
            'cover_path' => 'revista-adventista/covers/1906_M01.jpg',
            'cover_cached_at' => now(),
            'source_pdf_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.pdf',
            'pdf_path' => 'revista-adventista/pdfs/1906_M01.pdf',
            'pdf_cached_at' => now(),
            'is_active' => true,
            'synced_at' => now(),
        ]);

        Http::fake([
            RevistaAdventistaArchiveCatalogService::API_BASE.'/edicao*' => Http::response([$this->sampleEditions1906()[0]], 200),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg' => Http::response('cpb-cover', 200, ['Content-Type' => 'image/jpeg']),
            RevistaAdventistaAcesArchiveCatalogService::API_BASE.'/categories*' => Http::response([], 200),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906]);

        $this->assertTrue($result['ok']);

        $edition->refresh();

        $this->assertSame(RevistaAdventistaEdition::SOURCE_CPB, $edition->source);
        $this->assertSame('309', $edition->source_edition_id);
        $this->assertSame(309, $edition->cpb_edition_id);
        $this->assertSame(RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf', $edition->source_pdf_url);
        $this->assertNull($edition->pdf_path);
        Storage::disk('public')->assertMissing('revista-adventista/pdfs/1906_M01.pdf');
    }

    public function test_mobile_archive_lists_and_shows_edition(): void
    {
        $edition = RevistaAdventistaEdition::query()->create([
            'source' => RevistaAdventistaEdition::SOURCE_ACES,
            'source_edition_id' => '5002',
            'cpb_edition_id' => null,
            'year' => 1906,
            'month_code' => 'M01',
            'month' => 1,
            'title' => 'Janeiro de 1906',
            'source_cover_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.jpg',
            'source_pdf_url' => 'https://archivo.revistaadventista.editorialaces.com/wp-content/uploads/1906/01/ra_1906_01.pdf',
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
            'source' => RevistaAdventistaEdition::SOURCE_CPB,
            'source_edition_id' => '309',
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

    public function test_admin_can_delete_edition_and_local_assets(): void
    {
        Storage::fake('public');

        Permission::findOrCreate('news.manage');
        $user = User::factory()->create();
        $user->givePermissionTo('news.manage');

        Storage::disk('public')->put('revista-adventista/covers/1906_M01.jpg', 'cover-bytes');
        Storage::disk('public')->put('revista-adventista/pdfs/1906_M01.pdf', 'pdf-bytes');

        $edition = RevistaAdventistaEdition::query()->create([
            'source' => RevistaAdventistaEdition::SOURCE_CPB,
            'source_edition_id' => '309',
            'cpb_edition_id' => 309,
            'year' => 1906,
            'month_code' => 'M01',
            'month' => 1,
            'title' => 'Janeiro de 1906',
            'cover_path' => 'revista-adventista/covers/1906_M01.jpg',
            'pdf_path' => 'revista-adventista/pdfs/1906_M01.pdf',
            'source_pdf_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf',
            'is_active' => true,
            'synced_at' => now(),
        ]);

        $this->actingAs($user)
            ->delete(route('revista-adventista-acervo.edition.destroy', $edition))
            ->assertRedirect();

        $this->assertDatabaseMissing('revista_adventista_editions', ['id' => $edition->id]);
        Storage::disk('public')->assertMissing('revista-adventista/covers/1906_M01.jpg');
        Storage::disk('public')->assertMissing('revista-adventista/pdfs/1906_M01.pdf');
    }
}
