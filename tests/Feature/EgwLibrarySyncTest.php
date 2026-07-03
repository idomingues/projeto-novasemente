<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\LibraryBook;
use App\Services\CentroWhiteEgwCatalogService;
use App\Services\LibraryEgwSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EgwLibrarySyncTest extends TestCase
{
    use RefreshDatabase;

    private function sampleHtml(): string
    {
        return <<<'HTML'
<a class="elementor-cta" href="https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf">
<div class="elementor-cta__bg elementor-bg" style="background-image: url(https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.jpg);"></div>
<h2 class="elementor-cta__title elementor-cta__content-item elementor-content-item">Caminho a Cristo</h2>
</a>
<a class="elementor-cta" href="https://cdn.centrowhite.org.br/home/uploads/2022/11/O-Grande-Conflito.pdf">
<div class="elementor-cta__bg elementor-bg" style="background-image: url(https://cdn.centrowhite.org.br/home/uploads/2022/11/Grande-Conflito.jpg);"></div>
<h2 class="elementor-cta__title elementor-cta__content-item elementor-content-item">O Grande Conflito</h2>
</a>
<a class="elementor-cta" href="https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf">
<div class="elementor-cta__bg elementor-bg" style="background-image: url(https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.jpg);"></div>
<h2 class="elementor-cta__title elementor-cta__content-item elementor-content-item">Caminho a Cristo (duplicado)</h2>
</a>
HTML;
    }

    public function test_parser_extracts_books_and_deduplicates_by_pdf_url(): void
    {
        $service = app(CentroWhiteEgwCatalogService::class);
        $items = $service->parseHtml($this->sampleHtml());

        $this->assertCount(2, $items);
        $this->assertSame('Caminho a Cristo', $items[0]['title']);
        $this->assertSame('https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf', $items[0]['pdf_url']);
        $this->assertSame('https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.jpg', $items[0]['cover_url']);
        $this->assertSame('O Grande Conflito', $items[1]['title']);
    }

    public function test_sync_creates_global_egw_books_with_local_covers(): void
    {
        $this->seed();
        Storage::fake('public');

        Http::fake([
            CentroWhiteEgwCatalogService::CATALOG_URL => Http::response($this->sampleHtml(), 200),
            'https://cdn.centrowhite.org.br/*' => Http::response('fake-image-bytes', 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $result = app(LibraryEgwSyncService::class)->sync();

        $this->assertTrue($result['ok']);
        $this->assertSame(2, $result['created']);
        $this->assertSame(0, $result['updated']);

        $books = LibraryBook::query()->global()->where('category', LibraryBook::CATEGORY_EGW)->orderBy('title')->get();
        $this->assertCount(2, $books);

        $caminho = $books->firstWhere('title', 'Caminho a Cristo');
        $this->assertNotNull($caminho);
        $this->assertNull($caminho->church_id);
        $this->assertSame('Ellen G. White', $caminho->subtitle);
        $this->assertSame('https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf', $caminho->source_pdf_url);
        $this->assertStringStartsWith('library/egw/covers/', (string) $caminho->cover_path);
        Storage::disk('public')->assertExists((string) $caminho->cover_path);

        $again = app(LibraryEgwSyncService::class)->sync();
        $this->assertTrue($again['ok']);
        $this->assertSame(0, $again['created']);
        $this->assertSame(2, $again['updated']);
    }

    public function test_pdf_stream_proxies_and_caches_remote_pdf(): void
    {
        $this->seed();
        Storage::fake('public');

        $book = LibraryBook::query()->create([
            'church_id' => null,
            'title' => 'Caminho a Cristo',
            'subtitle' => 'Ellen G. White',
            'description' => null,
            'category' => LibraryBook::CATEGORY_EGW,
            'cover_path' => 'library/egw/covers/caminho-a-cristo.jpg',
            'source_cover_url' => 'https://cdn.example/cover.jpg',
            'pdf_path' => 'https://cdn.example/caminho-a-cristo.pdf',
            'source_pdf_url' => 'https://cdn.example/caminho-a-cristo.pdf',
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        Http::fake([
            'https://cdn.example/caminho-a-cristo.pdf' => Http::response('%PDF-1.4 egw-test', 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $churchId = (int) Church::query()->value('id');

        $response = $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.pdf-stream', $book));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString('%PDF-1.4 egw-test', $response->getContent());

        $book->refresh();
        $this->assertNotNull($book->pdf_cached_at);
        $this->assertStringStartsWith('library/egw/pdfs/', (string) $book->pdf_path);
        Storage::disk('public')->assertExists((string) $book->pdf_path);

        Http::fake();
        $cached = $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.pdf-stream', $book));

        $cached->assertOk();
        $cached->assertHeader('content-type', 'application/pdf');
        Storage::disk('public')->assertExists((string) $book->fresh()->pdf_path);
    }

    public function test_pdf_stream_recovers_remote_url_from_catalog_when_old_record_lost_source_url(): void
    {
        $this->seed();
        Storage::fake('public');

        $book = LibraryBook::query()->create([
            'church_id' => null,
            'title' => 'Caminho a Cristo (nova edição)',
            'subtitle' => 'Ellen G. White',
            'description' => null,
            'category' => LibraryBook::CATEGORY_EGW,
            'cover_path' => 'library/egw/covers/caminho-a-cristo.jpg',
            'source_cover_url' => 'https://cdn.example/cover.jpg',
            'pdf_path' => 'library/egw/pdfs/caminho-a-cristo.pdf',
            'source_pdf_url' => null,
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        Http::fake([
            CentroWhiteEgwCatalogService::CATALOG_URL => Http::response($this->sampleHtml(), 200),
            'https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf' => Http::response('%PDF-1.4 recovered-egw', 200, [
                'Content-Type' => 'application/pdf',
            ]),
        ]);

        $churchId = (int) Church::query()->value('id');

        $response = $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.pdf-stream', $book));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $this->assertStringContainsString('%PDF-1.4 recovered-egw', $response->getContent());

        $book->refresh();
        $this->assertSame(
            'https://cdn.centrowhite.org.br/home/uploads/2022/11/Caminho-a-Cristo.pdf',
            $book->source_pdf_url
        );
        $this->assertNotNull($book->pdf_cached_at);
        $this->assertStringStartsWith('library/egw/pdfs/', (string) $book->pdf_path);
        Storage::disk('public')->assertExists((string) $book->pdf_path);
    }

    public function test_mobile_library_lists_global_egw_books(): void
    {
        $this->seed();
        $churchId = (int) Church::query()->value('id');

        LibraryBook::query()->create([
            'church_id' => null,
            'title' => 'Patriarcas e Profetas',
            'subtitle' => 'Ellen G. White',
            'description' => null,
            'category' => LibraryBook::CATEGORY_EGW,
            'cover_path' => 'library/egw/covers/patriarcas.jpg',
            'source_cover_url' => null,
            'pdf_path' => 'https://cdn.example/patriarcas.pdf',
            'source_pdf_url' => 'https://cdn.example/patriarcas.pdf',
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        $response = $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Mobile/Library')
            ->has('books', 1)
            ->where('books.0.category', LibraryBook::CATEGORY_EGW)
            ->where('books.0.title', 'Patriarcas e Profetas')
        );
    }

    public function test_biblioteca_show_allows_global_egw_book(): void
    {
        $this->seed();
        $churchId = (int) Church::query()->value('id');

        $book = LibraryBook::query()->create([
            'church_id' => null,
            'title' => 'Educação',
            'subtitle' => 'Ellen G. White',
            'description' => null,
            'category' => LibraryBook::CATEGORY_EGW,
            'cover_path' => 'library/egw/covers/educacao.jpg',
            'source_cover_url' => null,
            'pdf_path' => 'https://cdn.example/educacao.pdf',
            'source_pdf_url' => 'https://cdn.example/educacao.pdf',
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.show', $book))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/LibraryShow')
                ->where('book.title', 'Educação')
            );
    }

    public function test_biblioteca_show_egw_uses_pdf_stream_route_even_with_local_cache(): void
    {
        $this->seed();
        Storage::fake('public');
        $churchId = (int) Church::query()->value('id');

        $pdfPath = 'library/egw/pdfs/educacao.pdf';
        Storage::disk('public')->put($pdfPath, '%PDF-1.4 cached');

        $book = LibraryBook::query()->create([
            'church_id' => null,
            'title' => 'Educação',
            'subtitle' => 'Ellen G. White',
            'description' => null,
            'category' => LibraryBook::CATEGORY_EGW,
            'cover_path' => 'library/egw/covers/educacao.jpg',
            'source_cover_url' => null,
            'pdf_path' => $pdfPath,
            'source_pdf_url' => 'https://cdn.example/educacao.pdf',
            'pdf_cached_at' => now(),
            'published_at' => null,
            'order' => 1,
            'created_by' => null,
        ]);

        $expectedUrl = route('mobile.biblioteca.pdf-stream', ['libraryBook' => $book->id], absolute: false);

        $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.show', $book))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Mobile/LibraryShow')
                ->where('book.pdf_url', $expectedUrl)
            );
    }

    public function test_biblioteca_show_returns_404_for_other_church_book(): void
    {
        $this->seed();

        $churchA = (int) Church::query()->value('id');
        $churchB = Church::query()->create([
            'name' => 'Outra Igreja EGW',
            'slug' => 'outra-igreja-egw-'.uniqid(),
        ]);

        $book = LibraryBook::query()->create([
            'church_id' => $churchB->id,
            'title' => 'Livro local',
            'subtitle' => null,
            'description' => null,
            'category' => LibraryBook::CATEGORY_BOOKS,
            'cover_path' => null,
            'pdf_path' => 'library/pdfs/local.pdf',
            'external_url' => null,
            'published_at' => null,
            'order' => 0,
            'created_by' => null,
        ]);

        $this
            ->withSession(['working_church_id' => $churchA])
            ->get(route('mobile.biblioteca.show', $book))
            ->assertNotFound();
    }
}
