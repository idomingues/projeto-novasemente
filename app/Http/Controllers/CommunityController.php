<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommunityRequest;
use App\Http\Requests\UpdateCommunityRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\ChurchCommunity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CommunityController extends Controller
{
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

    private function mapCommunityRow(ChurchCommunity $community, ?string $baseUrl = null): array
    {
        return [
            'id' => $community->id,
            'name' => $community->name,
            'description' => $community->description,
            'whatsappUrl' => $community->whatsapp_url,
            'coverUrl' => $community->resolvedCoverUrl($baseUrl),
            'sortOrder' => $community->sort_order,
            'isPublished' => $community->is_published,
        ];
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $canManage = $user?->can('communities.manage') ?? false;
        $canView = $canManage || ($user?->can('communities.view') ?? false);

        abort_unless($canView, 403);

        if (! Schema::hasTable('church_communities')) {
            return Inertia::render('Communities/Index', [
                'communities' => [],
                'canManage' => $canManage,
                'schemaReady' => false,
                'formOld' => [],
            ]);
        }

        $churchId = $this->currentChurchId($request);
        $communities = ChurchCommunity::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ChurchCommunity $c) => $this->mapCommunityRow($c, $request->getSchemeAndHttpHost()))
            ->values()
            ->all();

        $oldInput = $request->session()->getOldInput();

        return Inertia::render('Communities/Index', [
            'communities' => $communities,
            'canManage' => $canManage,
            'schemaReady' => true,
            'formOld' => ! empty($oldInput)
                ? Arr::only($oldInput, ['name', 'description', 'whatsapp_url', 'sort_order', 'is_published'])
                : [],
        ]);
    }

    public function store(StoreCommunityRequest $request): RedirectResponse
    {
        $churchId = $this->currentChurchId($request);
        if ($churchId === null) {
            return redirect()->route('communities.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $data = $request->validated();
        $coverPath = null;
        if ($request->hasFile('cover_image_file')) {
            $coverPath = $request->file('cover_image_file')->store('communities/covers', 'public');
        }

        $community = ChurchCommunity::create([
            'church_id' => $churchId,
            'name' => $data['name'],
            'description' => $data['description'],
            'whatsapp_url' => ChurchCommunity::normalizeWhatsappUrl($data['whatsapp_url']) ?? $data['whatsapp_url'],
            'cover_path' => $coverPath,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_published' => $request->boolean('is_published'),
        ]);

        return ListModalRedirect::toIndexEdit('communities.index', $community, 'Comunidade cadastrada com sucesso!');
    }

    public function update(UpdateCommunityRequest $request, ChurchCommunity $churchCommunity): RedirectResponse
    {
        $churchId = $this->currentChurchId($request);
        abort_unless($churchId && (int) $churchCommunity->church_id === (int) $churchId, 404);

        $data = $request->validated();
        $coverPath = $churchCommunity->cover_path;
        if ($request->hasFile('cover_image_file')) {
            $this->deletePublicFile($coverPath);
            $coverPath = $request->file('cover_image_file')->store('communities/covers', 'public');
        }

        $churchCommunity->update([
            'name' => $data['name'],
            'description' => $data['description'],
            'whatsapp_url' => ChurchCommunity::normalizeWhatsappUrl($data['whatsapp_url']) ?? $data['whatsapp_url'],
            'cover_path' => $coverPath,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_published' => $request->boolean('is_published'),
        ]);

        return ListModalRedirect::toIndexEdit('communities.index', $churchCommunity, 'Comunidade atualizada com sucesso!');
    }

    public function destroy(Request $request, ChurchCommunity $churchCommunity): RedirectResponse
    {
        abort_unless($request->user()?->can('communities.manage'), 403);

        $churchId = $this->currentChurchId($request);
        abort_unless($churchId && (int) $churchCommunity->church_id === (int) $churchId, 404);

        $this->deletePublicFile($churchCommunity->cover_path);
        $churchCommunity->delete();

        return redirect()->route('communities.index')->with('success', 'Comunidade removida com sucesso.');
    }

    public function mobile(Request $request): Response
    {
        if (! Schema::hasTable('church_communities')) {
            return Inertia::render('Mobile/Communities', ['communities' => []]);
        }

        $churchId = $this->currentChurchId($request);
        abort_unless($churchId, 404);

        $communities = ChurchCommunity::query()
            ->where('church_id', $churchId)
            ->published()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (ChurchCommunity $c) => $this->mapCommunityRow($c, $request->getSchemeAndHttpHost()))
            ->values()
            ->all();

        return Inertia::render('Mobile/Communities', [
            'communities' => $communities,
        ]);
    }
}
