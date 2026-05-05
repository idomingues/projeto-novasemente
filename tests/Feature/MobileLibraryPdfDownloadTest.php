<?php

namespace Tests\Feature;

use App\Models\Church;
use App\Models\LibraryBook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MobileLibraryPdfDownloadTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_sends_attachment_for_library_pdf(): void
    {
        $this->seed();

        $churchId = (int) Church::query()->value('id');
        $this->assertGreaterThan(0, $churchId);

        Storage::fake('public');
        Storage::disk('public')->put('library/pdfs/test-book.pdf', '%PDF-1.4 test');

        $book = LibraryBook::query()->create([
            'church_id' => $churchId,
            'title' => 'Livro de Teste',
            'subtitle' => null,
            'description' => null,
            'category' => LibraryBook::CATEGORY_BOOKS,
            'cover_path' => null,
            'pdf_path' => 'library/pdfs/test-book.pdf',
            'external_url' => null,
            'published_at' => null,
            'order' => 0,
            'created_by' => null,
        ]);

        $response = $this
            ->withSession(['working_church_id' => $churchId])
            ->get(route('mobile.biblioteca.pdf-download', $book));

        $response->assertOk();
        $response->assertHeader('content-type', 'application/pdf');
        $disposition = $response->headers->get('content-disposition');
        $this->assertIsString($disposition);
        $this->assertStringContainsStringIgnoringCase('attachment', $disposition);
        $this->assertStringContainsStringIgnoringCase('livro-de-teste.pdf', $disposition);
    }

    public function test_download_returns_404_for_other_church(): void
    {
        $this->seed();

        $churchA = (int) Church::query()->value('id');
        $churchB = Church::query()->create([
            'name' => 'Outra Igreja',
            'slug' => 'outra-igreja-'.uniqid(),
        ]);

        Storage::fake('public');
        Storage::disk('public')->put('library/pdfs/x.pdf', '%PDF');

        $book = LibraryBook::query()->create([
            'church_id' => $churchB->id,
            'title' => 'X',
            'subtitle' => null,
            'description' => null,
            'category' => LibraryBook::CATEGORY_BOOKS,
            'cover_path' => null,
            'pdf_path' => 'library/pdfs/x.pdf',
            'external_url' => null,
            'published_at' => null,
            'order' => 0,
            'created_by' => null,
        ]);

        $this
            ->withSession(['working_church_id' => $churchA])
            ->get(route('mobile.biblioteca.pdf-download', $book))
            ->assertNotFound();
    }
}
