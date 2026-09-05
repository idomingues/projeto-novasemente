<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\SaturdayProgram;
use App\Services\SaturdayProgramService;
use App\Support\StorageUrl;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SaturdayProgramController extends Controller
{
    public function __construct(
        private readonly SaturdayProgramService $saturdayPrograms,
    ) {}

    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $now = now($this->saturdayPrograms->timezone());

        $items = SaturdayProgram::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderByDesc('saturday_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (SaturdayProgram $item) => $this->serialize($item, $now))
            ->values()
            ->all();

        return Inertia::render('ProgramacaoSabado/Index', [
            'items' => $items,
            'canManage' => $request->user()?->can('programacao-sabado.manage') ?? false,
        ]);
    }

    public function store(Request $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('programacao-sabado.index')
                ->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $data = $this->validated($request, requirePdf: true);
        $this->saturdayPrograms->assertSaturdayDate($data['saturday_date']);

        $existing = SaturdayProgram::query()
            ->where('church_id', $churchId)
            ->whereDate('saturday_date', $data['saturday_date'])
            ->first();

        $pdfPath = $request->file('pdf_file')->store('saturday-programs/pdfs', 'public');
        if ($existing !== null) {
            $this->deletePublicFile($existing->pdf_path);
            $existing->update([
                'title' => $data['title'],
                'pdf_path' => $pdfPath,
                'published_at' => $data['published_at'],
                'is_active' => true,
            ]);
            $item = $existing;
        } else {
            $item = SaturdayProgram::query()->create([
                'church_id' => $churchId,
                'saturday_date' => $data['saturday_date'],
                'title' => $data['title'],
                'pdf_path' => $pdfPath,
                'published_at' => $data['published_at'],
                'is_active' => true,
            ]);
        }

        return ListModalRedirect::toIndexEdit(
            'programacao-sabado.index',
            $item,
            'Programação do sábado publicada com sucesso!',
        );
    }

    public function update(Request $request, SaturdayProgram $saturdayProgram)
    {
        $this->assertSameChurch($saturdayProgram);

        $data = $this->validated($request, requirePdf: false);
        $this->saturdayPrograms->assertSaturdayDate($data['saturday_date']);

        $pdfPath = $saturdayProgram->pdf_path;
        if ($request->hasFile('pdf_file')) {
            $this->deletePublicFile($pdfPath);
            $pdfPath = $request->file('pdf_file')->store('saturday-programs/pdfs', 'public');
        }

        if ($pdfPath === null || $pdfPath === '') {
            return redirect()->route('programacao-sabado.index')
                ->withErrors(['pdf_file' => 'Envie o PDF da programação.'])
                ->withInput($request->except(['pdf_file']));
        }

        // Se mudou a data do sábado e já existe outro registro nessa data, falha na unique.
        $existsOther = SaturdayProgram::query()
            ->where('church_id', $saturdayProgram->church_id)
            ->where('saturday_date', $data['saturday_date'])
            ->where('id', '!=', $saturdayProgram->id)
            ->exists();

        if ($existsOther) {
            return redirect()->route('programacao-sabado.index')
                ->withErrors(['saturday_date' => 'Já existe uma programação para este sábado.'])
                ->withInput($request->except(['pdf_file']));
        }

        $saturdayProgram->update([
            'saturday_date' => $data['saturday_date'],
            'title' => $data['title'],
            'pdf_path' => $pdfPath,
            'published_at' => $data['published_at'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        return ListModalRedirect::toIndexEdit(
            'programacao-sabado.index',
            $saturdayProgram,
            'Programação do sábado atualizada com sucesso!',
        );
    }

    public function destroy(SaturdayProgram $saturdayProgram)
    {
        $this->assertSameChurch($saturdayProgram);
        $this->deletePublicFile($saturdayProgram->pdf_path);
        $saturdayProgram->delete();

        return redirect()->route('programacao-sabado.index')
            ->with('success', 'Programação do sábado excluída com sucesso!');
    }

    private function assertSameChurch(SaturdayProgram $item): void
    {
        $churchId = $this->currentChurchId();
        abort_unless($churchId !== null && (int) $item->church_id === $churchId, 404);
    }

    /**
     * @return array{saturday_date: string, title: ?string, published_at: Carbon, is_active?: bool}
     */
    private function validated(Request $request, bool $requirePdf): array
    {
        $rules = [
            'saturday_date' => ['required', 'date', 'date_format:Y-m-d'],
            'title' => ['nullable', 'string', 'max:160'],
            'published_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
            'pdf_file' => array_values(array_filter([
                $requirePdf ? 'required' : 'nullable',
                'file',
                'mimes:pdf',
                'max:20480',
            ])),
        ];

        $data = $request->validate($rules, [
            'pdf_file.required' => 'Envie o PDF da programação.',
            'pdf_file.mimes' => 'O arquivo deve ser um PDF.',
            'saturday_date.required' => 'Informe a data do sábado.',
        ]);

        $title = isset($data['title']) ? trim((string) $data['title']) : '';
        $publishedAt = ! empty($data['published_at'])
            ? Carbon::parse($data['published_at'], $this->saturdayPrograms->timezone())
            : now($this->saturdayPrograms->timezone());

        return [
            'saturday_date' => $data['saturday_date'],
            'title' => $title !== '' ? $title : null,
            'published_at' => $publishedAt,
            'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(SaturdayProgram $item, Carbon $now): array
    {
        $within = $this->saturdayPrograms->isWithinWindow($item, $now);
        $expired = $this->saturdayPrograms->hasPassedExpiry($item, $now);
        $pdfPath = is_string($item->pdf_path) ? trim($item->pdf_path) : '';

        return [
            'id' => $item->id,
            'saturday_date' => $item->saturday_date?->toDateString(),
            'title' => $item->title,
            'pdf_url' => $pdfPath !== '' ? StorageUrl::publicMediaUrl($pdfPath) : null,
            'published_at' => $item->published_at?->timezone($this->saturdayPrograms->timezone())->toIso8601String(),
            'is_active' => (bool) $item->is_active,
            'is_visible' => $within,
            'is_expired' => $expired,
            'expires_at' => $this->saturdayPrograms
                ->expiresAt($item->saturday_date)
                ->toIso8601String(),
        ];
    }

    private function deletePublicFile(?string $path): void
    {
        $path = is_string($path) ? trim($path) : '';
        if ($path === '') {
            return;
        }
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
