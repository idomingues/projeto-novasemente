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

    public function test_sync_creates_editions_with_remote_urls_only(): void
    {
        Storage::fake('public');

        Http::fake([
            RevistaAdventistaArchiveCatalogService::API_BASE.'/edicao*' => Http::response($this->sampleEditions1906(), 200),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'*' => Http::response('', 200),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906]);

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(0, $result['covers_downloaded']);
        $this->assertSame(0, $result['pdfs_downloaded']);

        $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', 309)->first();
        $this->assertNotNull($edition);
        $this->assertFalse($edition->hasLocalCover());
        $this->assertNull($edition->cover_path);
        $this->assertNull($edition->pdf_path);
        $this->assertSame(RevistaAdventistaEdition::SOURCE_CPB, $edition->source);
        $this->assertSame('309', $edition->source_edition_id);
        $this->assertSame(
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01_web.jpg',
            $edition->source_cover_url,
        );
        $this->assertSame(
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'1906_M01.pdf',
            $edition->source_pdf_url,
        );
    }

    public function test_sync_skips_editions_with_missing_remote_assets(): void
    {
        Storage::fake('public');

        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            $url = $request->url();

            if (str_contains($url, '/edicao')) {
                return Http::response([
                    [
                        'id_edicao' => 1760,
                        'ano' => 2026,
                        'mes' => 'M01',
                        'capa' => '2026_M01_web.jpg',
                        'arquivo' => '2026_M01.pdf',
                        'ativo' => true,
                    ],
                    [
                        'id_edicao' => 1761,
                        'ano' => 2026,
                        'mes' => 'M02',
                        'capa' => '2026_M02.jpg',
                        'arquivo' => '2026_M02.pdf',
                        'ativo' => true,
                    ],
                ], 200);
            }

            if (str_contains($url, '2026_M01')) {
                return Http::response('', 200);
            }

            return Http::response('', 404);
        });

        $orphan = RevistaAdventistaEdition::query()->create([
            'source' => RevistaAdventistaEdition::SOURCE_CPB,
            'source_edition_id' => '1761',
            'cpb_edition_id' => 1761,
            'year' => 2026,
            'month_code' => 'M02',
            'month' => 2,
            'title' => 'Fevereiro de 2026',
            'source_cover_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'2026_M02.jpg',
            'source_pdf_url' => RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'2026_M02.pdf',
            'is_active' => true,
            'synced_at' => now(),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([2026]);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['created']);
        $this->assertSame(1, $result['removed']);
        $this->assertDatabaseHas('revista_adventista_editions', ['cpb_edition_id' => 1760]);
        $this->assertDatabaseMissing('revista_adventista_editions', ['id' => $orphan->id]);
    }

    public function test_sync_downloads_covers_only_when_forced(): void
    {
        Storage::fake('public');

        Http::fake([
            RevistaAdventistaArchiveCatalogService::API_BASE.'/edicao*' => Http::response([$this->sampleEditions1906()[0]], 200),
            RevistaAdventistaArchiveCatalogService::STORAGE_BASE.'*' => Http::response('cover-bytes', 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $result = app(RevistaAdventistaArchiveSyncService::class)->sync([1906], forceCovers: true);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['covers_downloaded']);

        $edition = RevistaAdventistaEdition::query()->where('cpb_edition_id', 309)->first();
        $this->assertNotNull($edition);
        $this->assertTrue($edition->hasLocalCover());
        Storage::disk('public')->assertExists((string) $edition->cover_path);
    }

    public function test_purge_removes_editions_and_local_assets(): void
    {
        Storage::fake('public');

        Storage::disk('public')->put('revista-adventista/covers/1906_M01.jpg', 'cover-bytes');
        Storage::disk('public')->put('revista-adventista/pdfs/1906_M01.pdf', 'pdf-bytes');

        RevistaAdventistaEdition::query()->create([
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

        $result = app(RevistaAdventistaArchiveSyncService::class)->purge();

        $this->assertSame(1, $result['deleted']);
        $this->assertSame(1, $result['covers_deleted']);
        $this->assertSame(1, $result['pdfs_deleted']);
        $this->assertSame(0, RevistaAdventistaEdition::query()->count());
        Storage::disk('public')->assertMissing('revista-adventista/covers/1906_M01.jpg');
        Storage::disk('public')->assertMissing('revista-adventista/pdfs/1906_M01.pdf');
    }

    public function test_mobile_archive_lists_and_shows_edition(): void
    {
        $edition = RevistaAdventistaEdition::query()->create([
            'source' => RevistaAdventistaEdition::SOURCE_CPB,
            'source_edition_id' => '309',
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

    public function test_mobile_archive_defaults_to_year_2010_when_available(): void
    {
        foreach ([1906, 2010, 2020] as $year) {
            RevistaAdventistaEdition::query()->create([
                'source' => RevistaAdventistaEdition::SOURCE_CPB,
                'source_edition_id' => (string) (3000 + $year),
                'cpb_edition_id' => 3000 + $year,
                'year' => $year,
                'month_code' => 'M01',
                'month' => 1,
                'title' => "Janeiro de {$year}",
                'source_cover_url' => "https://imagens.cpb.com.br/acervos/ra/{$year}_M01_web.jpg",
                'source_pdf_url' => "https://imagens.cpb.com.br/acervos/ra/{$year}_M01.pdf",
                'is_active' => true,
                'synced_at' => now(),
            ]);
        }

        $this->get(route('mobile.acervo-revista-adventista'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/RevistaAdventistaAcervo')
                ->where('selectedYear', 2010)
                ->has('editions', 1));
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
