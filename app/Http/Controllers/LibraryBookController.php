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
                    // Meditação e Lição agora usam links globais em Configurações.
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
                'description' => $b->description,
                'category' => $b->category,
                'cover_url' => $b->resolvedCoverUrl($baseUrl),
                'pdf_url' => $b->resolvedPdfUrl($baseUrl),
                'external_url' => $this->normalizedExternalUrl($b->external_url),
                'published_at' => $b->published_at?->toIso8601String(),
                'created_at' => $b->created_at->toIso8601String(),
                'author' => $b->author ? ['name' => $b->author->name] : null,
            ]);

        $oldInput = $request->session()->getOldInput();

        return Inertia::render('LibraryBooks/Index', [
            'books' => $books,
            'canManage' => $canManage,
            'formOld' => ! empty($oldInput) ? Arr::only($oldInput, ['title', 'subtitle', 'description', 'category', 'external_url', 'published_at']) : [],
            'categories' => [
                ['value' => LibraryBook::CATEGORY_BOOKS, 'label' => 'Livros'],
                ['value' => LibraryBook::CATEGORY_MAGAZINES, 'label' => 'Revistas'],
                // Meditação e Lição agora usam links globais em Configurações.
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

        $uploadRedirect = $this->redirectIfInvalidLibraryUpload($request);
        if ($uploadRedirect !== null) {
            return $uploadRedirect;
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'category' => ['required', 'string', Rule::in(LibraryBook::categories())],
            'cover_image_file' => ['required', 'image', 'max:4096'],
            'external_url' => ['nullable', 'string', 'max:2048', 'active_url'],
            'pdf_file' => [
                Rule::requiredIf(fn () => ! LibraryBook::categoryAllowsExternalUrl((string) $request->input('category'))),
                'nullable',
                'file',
                'max:20480',
                $this->pdfFileRule(),
            ],
            'published_at' => ['nullable', 'date_format:Y-m'],
        ], $this->libraryBookValidationMessages());

        $this->assertLibraryBookPdfOrExternalUrl($data['category'], $data['external_url'] ?? null, $request->hasFile('pdf_file'));

        $churchId = $this->currentChurchId($request);
        if ($churchId === null) {
            return redirect()->route('library-books.index')->with('error', 'Nenhuma igreja cadastrada. Crie uma igreja antes de adicionar publicações.');
        }

        $coverPath = $request->file('cover_image_file')->store('library/covers', 'public');
        $externalUrl = LibraryBook::categoryAllowsExternalUrl($data['category'])
            ? $this->normalizedExternalUrl($data['external_url'] ?? null)
            : null;
        $pdfPath = null;
        if ($request->hasFile('pdf_file')) {
            $pdfPath = $request->file('pdf_file')->store('library/pdfs', 'public');
        }

        $publishedAt = $this->publishedAtFromYearMonth($data['published_at'] ?? null);
        $maxOrder = LibraryBook::where('church_id', $churchId)->max('order') ?? 0;

        LibraryBook::create([
            'church_id' => $churchId,
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'cover_path' => $coverPath,
            'pdf_path' => $pdfPath,
            'external_url' => $externalUrl,
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

        $uploadRedirect = $this->redirectIfInvalidLibraryUpload($request);
        if ($uploadRedirect !== null) {
            return $uploadRedirect;
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:5000'],
            'category' => ['required', 'string', Rule::in(LibraryBook::categories())],
            'cover_image_file' => ['nullable', 'image', 'max:4096'],
            'external_url' => ['nullable', 'string', 'max:2048', 'active_url'],
            'pdf_file' => [
                Rule::requiredIf(fn () => ! LibraryBook::categoryAllowsExternalUrl((string) $request->input('category')) && empty($libraryBook->pdf_path)),
                'nullable',
                'file',
                'max:20480',
                $this->pdfFileRule(),
            ],
            'published_at' => ['nullable', 'date_format:Y-m'],
        ], $this->libraryBookValidationMessages());

        $externalUrlForCheck = LibraryBook::categoryAllowsExternalUrl($data['category'])
            ? $this->normalizedExternalUrl($data['external_url'] ?? null)
            : null;
        $this->assertLibraryBookPdfOrExternalUrlForUpdate(
            $data['category'],
            $externalUrlForCheck,
            $request->hasFile('pdf_file'),
            (string) ($libraryBook->pdf_path ?? ''),
        );

        $coverPath = $libraryBook->cover_path;
        if ($request->hasFile('cover_image_file')) {
            $this->deletePublicFile($coverPath);
            $coverPath = $request->file('cover_image_file')->store('library/covers', 'public');
        }

        $pdfPath = $libraryBook->pdf_path;
        $externalUrl = LibraryBook::categoryAllowsExternalUrl($data['category'])
            ? $externalUrlForCheck
            : null;

        if ($request->hasFile('pdf_file')) {
            $this->deletePublicFile($pdfPath);
            $pdfPath = $request->file('pdf_file')->store('library/pdfs', 'public');
            $externalUrl = null;
        } elseif (LibraryBook::categoryAllowsExternalUrl($data['category']) && $externalUrl !== null) {
            if (is_string($pdfPath) && $pdfPath !== '') {
                $this->deletePublicFile($pdfPath);
                $pdfPath = null;
            }
        }

        $publishedAt = $this->publishedAtFromYearMonth($data['published_at'] ?? null);

        $libraryBook->update([
            'title' => $data['title'],
            'subtitle' => $data['subtitle'] ?? null,
            'description' => $data['description'] ?? null,
            'category' => $data['category'],
            'cover_path' => $coverPath,
            'pdf_path' => $pdfPath,
            'external_url' => $externalUrl,
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

    private function normalizedExternalUrl(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function assertLibraryBookPdfOrExternalUrl(string $category, ?string $externalUrl, bool $hasPdfUpload): void
    {
        if (! LibraryBook::categoryAllowsExternalUrl($category)) {
            return;
        }
        if ($externalUrl === null && ! $hasPdfUpload) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'pdf_file' => 'Para Meditação ou Lição, envie um PDF ou preencha o link externo.',
            ]);
        }
        if ($externalUrl !== null && $hasPdfUpload) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'external_url' => 'Para Meditação ou Lição, use PDF ou link externo — não os dois ao mesmo tempo.',
                'pdf_file' => 'Para Meditação ou Lição, use PDF ou link externo — não os dois ao mesmo tempo.',
            ]);
        }
    }

    private function assertLibraryBookPdfOrExternalUrlForUpdate(
        string $category,
        ?string $externalUrl,
        bool $hasPdfUpload,
        string $existingPdfPath,
    ): void {
        if (! LibraryBook::categoryAllowsExternalUrl($category)) {
            return;
        }
        $hasPdf = $hasPdfUpload || $existingPdfPath !== '';
        if ($externalUrl === null && ! $hasPdf) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'pdf_file' => 'Para Meditação ou Lição, envie um PDF ou preencha o link externo.',
            ]);
        }
        if ($externalUrl !== null && $hasPdfUpload) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'external_url' => 'Para Meditação ou Lição, use PDF ou link externo — não os dois ao mesmo tempo.',
                'pdf_file' => 'Para Meditação ou Lição, use PDF ou link externo — não os dois ao mesmo tempo.',
            ]);
        }
    }

    /**
     * Antes da validação Laravel: se o PHP marcou o upload como inválido, devolve mensagem útil
     * (limites PHP/Nginx, envio parcial) em vez da mensagem genérica da regra "uploaded".
     *
     * @return \Illuminate\Http\RedirectResponse|null
     */
    private function redirectIfInvalidLibraryUpload(Request $request): ?\Illuminate\Http\RedirectResponse
    {
        $exceptFiles = ['cover_image_file', 'pdf_file'];

        foreach (['cover_image_file', 'pdf_file'] as $field) {
            if (! $request->hasFile($field)) {
                continue;
            }
            $file = $request->file($field);
            if (! $file instanceof \Illuminate\Http\UploadedFile || $file->isValid()) {
                continue;
            }
            $isPdf = $field === 'pdf_file';
            $message = $this->messageForPhpUploadError($file->getError(), $isPdf);

            return redirect()->route('library-books.index')
                ->withErrors([$field => $message])
                ->withInput($request->except($exceptFiles));
        }

        return null;
    }

    private function messageForPhpUploadError(int $code, bool $isPdf): string
    {
        $subject = $isPdf ? 'O PDF' : 'A imagem da capa';

        return match ($code) {
            \UPLOAD_ERR_INI_SIZE => $subject.' ultrapassa o limite upload_max_filesize do PHP neste servidor. Peça ao apoio técnico para aumentar upload_max_filesize e post_max_size (por exemplo 32M). A aplicação aceita PDF até 20 MB.',
            \UPLOAD_ERR_FORM_SIZE => $subject.' ultrapassa o limite definido no formulário no servidor.',
            \UPLOAD_ERR_PARTIAL => $subject.' não foi recebido por completo (muito comum quando o Nginx corta o pedido: configure client_max_body_size com margem, ex. 32M, e recarregue o Nginx). Tente outra rede ou um ficheiro mais pequeno.',
            \UPLOAD_ERR_NO_FILE => $isPdf ? 'Não foi enviado nenhum PDF.' : 'Não foi enviada nenhuma imagem de capa.',
            \UPLOAD_ERR_NO_TMP_DIR => 'Falta pasta temporária no servidor para receber o ficheiro. Contacte o apoio técnico.',
            \UPLOAD_ERR_CANT_WRITE => 'O servidor não conseguiu gravar o ficheiro enviado. Contacte o apoio técnico.',
            \UPLOAD_ERR_EXTENSION => 'Uma extensão do PHP bloqueou o envio. Contacte o apoio técnico.',
            default => $subject.' não chegou ao servidor por completo. Peça ao apoio técnico para rever limites de upload (Nginx: client_max_body_size; PHP: upload_max_filesize e post_max_size).',
        };
    }

    /**
     * @return array<string, string>
     */
    private function libraryBookValidationMessages(): array
    {
        return [
            'pdf_file.uploaded' => 'O PDF não chegou ao servidor por completo. Peça ao apoio técnico para rever limites de upload (Nginx e PHP) ou tente outra rede.',
            'cover_image_file.uploaded' => 'A imagem da capa não chegou ao servidor por completo. Peça ao apoio técnico para rever limites de upload (Nginx e PHP) ou tente outra rede.',
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
