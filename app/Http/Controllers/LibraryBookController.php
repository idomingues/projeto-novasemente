<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\LibraryBook;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LibraryBookController extends Controller
{
    /** Mesma lógica que o resto do painel: sessão, primeira ativa, ou primeira cadastrada (dev / igreja inativa). */
    private function currentChurchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request);
    }

    private function deletePublicFile(?string $path): void
    {
        if (! is_string($path) || $path === '' || str_starts_with($path, 'http')) {
            return;
        }
        Storage::disk('public')->delete($path);
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId($request);
        $canManage = $request->user()?->can('library.manage') ?? false;

        if (! Schema::hasTable('library_books')) {
            return Inertia::render('LibraryBooks/Index', [
                'books' => [],
                'canManage' => $canManage,
                'formOld' => [],
                'categories' => [
                    ['value' => LibraryBook::CATEGORY_BOOKS, 'label' => 'Livros'],
                    ['value' => LibraryBook::CATEGORY_MAGAZINES, 'label' => 'Revistas'],
                    ['value' => LibraryBook::CATEGORY_MEDITATION, 'label' => 'Meditação'],
                ],
                'librarySetupMessage' => 'A biblioteca ainda não está disponível neste ambiente. Peça ao responsável técnico para concluir a atualização da base de dados.',
            ]);
        }

        $baseUrl = $request->getSchemeAndHttpHost();
        $books = LibraryBook::query()
            ->with('author')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('order')
            ->orderByDesc('published_at')
            ->orderBy('title')
            ->get()
            ->map(fn (LibraryBook $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'subtitle' => $b->subtitle,
                'category' => $b->category,
                'cover_url' => $b->resolvedCoverUrl($baseUrl),
                'pdf_url' => $b->resolvedPdfUrl($baseUrl),
                'published_at' => $b->published_at?->toIso8601String(),
                'created_at' => $b->created_at->toIso8601String(),
                'author' => $b->author ? ['name' => $b->author->name] : null,
            ]);

        $oldInput = $request->session()->getOldInput();

        return Inertia::render('LibraryBooks/Index', [
            'books' => $books,
            'canManage' => $canManage,
            'formOld' => ! empty($oldInput) ? Arr::only($oldInput, ['title', 'subtitle', 'category', 'published_at']) : [],
            'categories' => [
                ['value' => LibraryBook::CATEGORY_BOOKS, 'label' => 'Livros'],
                ['value' => LibraryBook::CATEGORY_MAGAZINES, 'label' => 'Revistas'],
                ['value' => LibraryBook::CATEGORY_MEDITATION, 'label' => 'Meditação'],
            ],
            'librarySetupMessage' => null,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('library.manage');

        if (! Schema::hasTable('library_books')) {
            return redirect()->route('library-books.index')->with(
                'error',
                'A biblioteca ainda não está disponível. É preciso concluir a atualização da base de dados.',
            );
        }

        if ($request->input('published_at') === '') {
            $request->merge(['published_at' => null]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', Rule::in(LibraryBook::categories())],
            'cover_image_file' => ['required', 'image', 'max:4096'],
            'pdf_file' => ['required', 'file', 'max:20480', $this->pdfFileRule()],
            'published_at' => ['nullable', 'date_format:Y-m'],
        ], $this->libraryBookValidationMessages());

        $churchId = $this->currentChurchId($request);
        if ($churchId === null) {
            return redirect()->route('library-books.index')->with('error', 'Nenhuma igreja cadastrada. Crie uma igreja antes de adicionar publicações.');
        }

        $coverPath = $request->file('cover_image_file')->store('library/covers', 'public');
        $pdfPath = $request->file('pdf_file')->store('library/pdfs', 'public');

        $publishedAt = $this->publishedAtFromYearMonth($data['published_at'] ?? null);
        $maxOrder = LibraryBook::where('church_id', $churchId)->max('order') ?? 0;

        LibraryBook::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'category' => $data['category'],
            'cover_path' => $coverPath,
            'pdf_path' => $pdfPath,
            'published_at' => $publishedAt,
            'order' => $maxOrder + 1,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('library-books.index')->with('success', 'Publicação adicionada à biblioteca.');
    }

    public function update(Request $request, LibraryBook $libraryBook)
    {
        $this->authorize('library.manage');

        if (! Schema::hasTable('library_books')) {
            return redirect()->route('library-books.index')->with(
                'error',
                'A biblioteca ainda não está disponível. É preciso concluir a atualização da base de dados.',
            );
        }

        $churchId = $this->currentChurchId($request);
        if ($churchId === null || (int) $libraryBook->church_id !== (int) $churchId) {
            abort(404);
        }

        if ($request->input('published_at') === '') {
            $request->merge(['published_at' => null]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', Rule::in(LibraryBook::categories())],
            'cover_image_file' => ['nullable', 'image', 'max:4096'],
            'pdf_file' => ['nullable', 'file', 'max:20480', $this->pdfFileRule()],
            'published_at' => ['nullable', 'date_format:Y-m'],
        ], $this->libraryBookValidationMessages());

        $coverPath = $libraryBook->cover_path;
        if ($request->hasFile('cover_image_file')) {
            $this->deletePublicFile($coverPath);
            $coverPath = $request->file('cover_image_file')->store('library/covers', 'public');
        }

        $pdfPath = $libraryBook->pdf_path;
        if ($request->hasFile('pdf_file')) {
            $this->deletePublicFile($pdfPath);
            $pdfPath = $request->file('pdf_file')->store('library/pdfs', 'public');
        }

        $publishedAt = $this->publishedAtFromYearMonth($data['published_at'] ?? null);

        $libraryBook->update([
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'category' => $data['category'],
            'cover_path' => $coverPath,
            'pdf_path' => $pdfPath,
            'published_at' => $publishedAt,
        ]);

        return redirect()->route('library-books.index')->with('success', 'Publicação atualizada.');
    }

    public function destroy(Request $request, LibraryBook $libraryBook)
    {
        $this->authorize('library.manage');

        if (! Schema::hasTable('library_books')) {
            return redirect()->route('library-books.index')->with(
                'error',
                'A biblioteca ainda não está disponível. É preciso concluir a atualização da base de dados.',
            );
        }

        $churchId = $this->currentChurchId($request);
        if ($churchId === null || (int) $libraryBook->church_id !== (int) $churchId) {
            abort(404);
        }

        $this->deletePublicFile($libraryBook->cover_path);
        $this->deletePublicFile($libraryBook->pdf_path);
        $libraryBook->delete();

        return redirect()->route('library-books.index')->with('success', 'Publicação removida.');
    }

    private function publishedAtFromYearMonth(mixed $value): ?Carbon
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}$/', $value)) {
            return null;
        }

        return Carbon::createFromFormat('Y-m', $value)->startOfMonth();
    }

    /**
     * @return array<string, string>
     */
    private function libraryBookValidationMessages(): array
    {
        return [
            'pdf_file.uploaded' => 'O PDF não chegou ao servidor por completo. Tente um ficheiro mais pequeno ou outra rede. Se continuar a falhar, contacte o apoio técnico.',
            'cover_image_file.uploaded' => 'A imagem da capa não chegou ao servidor por completo. Tente outra imagem ou mais tarde. Se continuar a falhar, contacte o apoio técnico.',
            'published_at.date_format' => 'Escolha um mês e ano válidos para a publicação.',
        ];
    }

    /**
     * Aceita PDF real e ficheiros com MIME genérico (ex.: application/octet-stream) desde que a extensão seja .pdf.
     */
    private function pdfFileRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if (! $value instanceof \Illuminate\Http\UploadedFile) {
                return;
            }
            $ext = strtolower($value->getClientOriginalExtension());
            if ($ext !== 'pdf') {
                $fail('O ficheiro deve ter extensão .pdf.');

                return;
            }
            $mime = (string) $value->getMimeType();
            $allowedMimes = ['application/pdf', 'application/x-pdf', 'application/octet-stream', 'binary/octet-stream'];
            if ($mime !== '' && ! in_array($mime, $allowedMimes, true)) {
                $fail('Envie um ficheiro PDF válido.');
            }
        };
    }
}
