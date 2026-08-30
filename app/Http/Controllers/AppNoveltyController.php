<?php

namespace App\Http\Controllers;

use App\Http\Support\ListModalRedirect;
use App\Models\AppNovelty;
use App\Models\Church;
use App\Models\UserDismissedAppNovelty;
use App\Support\AppNoveltyModules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppNoveltyController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function currentChurch(): ?Church
    {
        $id = $this->currentChurchId();

        return $id !== null ? Church::query()->find($id) : null;
    }

    public function index(Request $request): Response
    {
        $this->authorize('app_novelties.manage');

        $church = $this->currentChurch();
        $churchId = $church?->id;

        if (! Schema::hasTable('app_novelties')) {
            return Inertia::render('AppNovelties/Index', [
                'novelties' => [],
                'modules' => [],
                'schemaReady' => false,
            ]);
        }

        $novelties = $churchId === null
            ? collect()
            : AppNovelty::query()
                ->where('church_id', $churchId)
                ->with('author:id,name')
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->get();

        return Inertia::render('AppNovelties/Index', [
            'novelties' => $novelties->map(fn (AppNovelty $row) => $this->serialize($row))->values(),
            'modules' => AppNoveltyModules::forChurch($church),
            'schemaReady' => true,
        ]);
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $this->authorize('app_novelties.manage');
        abort_unless(Schema::hasTable('app_novelties'), 400, 'Tabela de novidades ainda não foi criada.');

        $church = $this->currentChurch();
        if ($church === null) {
            return redirect()->route('app-novelties.index')
                ->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $valid = $this->validated($request, $church);
        $module = AppNoveltyModules::find($valid['module_key'], $church);
        abort_unless($module !== null, 422);

        $isActive = (bool) $valid['is_active'];

        $novelty = AppNovelty::query()->create([
            'church_id' => $church->id,
            'title' => $valid['title'],
            'body' => $valid['body'],
            'module_key' => $module['key'],
            'route_name' => $module['route'],
            'is_active' => $isActive,
            'published_at' => $isActive ? now() : null,
            'created_by' => $request->user()?->id,
        ]);

        return ListModalRedirect::toIndexEdit('app-novelties.index', $novelty, 'Novidade publicada.');
    }

    public function update(Request $request, AppNovelty $appNovelty): RedirectResponse|JsonResponse
    {
        $this->authorize('app_novelties.manage');
        $this->assertSameChurch($appNovelty);

        $church = $this->currentChurch();
        abort_unless($church !== null, 422);

        $valid = $this->validated($request, $church);
        $module = AppNoveltyModules::find($valid['module_key'], $church);
        abort_unless($module !== null, 422);

        $isActive = (bool) $valid['is_active'];
        $publishedAt = $appNovelty->published_at;
        if ($isActive && $publishedAt === null) {
            $publishedAt = now();
        }
        if (! $isActive) {
            $publishedAt = $appNovelty->published_at;
        }

        $appNovelty->update([
            'title' => $valid['title'],
            'body' => $valid['body'],
            'module_key' => $module['key'],
            'route_name' => $module['route'],
            'is_active' => $isActive,
            'published_at' => $publishedAt,
        ]);

        return ListModalRedirect::toIndexEdit('app-novelties.index', $appNovelty, 'Novidade atualizada.');
    }

    public function setActive(Request $request, AppNovelty $appNovelty): RedirectResponse
    {
        $this->authorize('app_novelties.manage');
        $this->assertSameChurch($appNovelty);

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $isActive = (bool) $data['is_active'];
        $appNovelty->update([
            'is_active' => $isActive,
            'published_at' => $isActive
                ? ($appNovelty->published_at ?? now())
                : $appNovelty->published_at,
        ]);

        return redirect()->route('app-novelties.index')->with(
            'success',
            $appNovelty->is_active ? 'Novidade ativada.' : 'Novidade desativada.',
        );
    }

    public function destroy(AppNovelty $appNovelty): RedirectResponse
    {
        $this->authorize('app_novelties.manage');
        $this->assertSameChurch($appNovelty);

        $appNovelty->delete();

        return redirect()->route('app-novelties.index')->with('success', 'Novidade excluída.');
    }

    public function dismiss(Request $request, AppNovelty $appNovelty): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $churchId = $this->currentChurchId();
        abort_unless($churchId !== null && (int) $appNovelty->church_id === $churchId, 404);

        UserDismissedAppNovelty::query()->firstOrCreate([
            'user_id' => $user->id,
            'app_novelty_id' => $appNovelty->id,
        ]);

        if ($request->expectsJson()) {
            return response()->json(['ok' => true]);
        }

        return back();
    }

    /**
     * @return array{title: string, body: string, module_key: string, is_active: bool}
     */
    private function validated(Request $request, Church $church): array
    {
        $keys = AppNoveltyModules::keysForChurch($church);

        $valid = $request->validate([
            'title' => ['required', 'string', 'max:80'],
            'body' => ['required', 'string', 'max:280'],
            'module_key' => ['required', 'string', Rule::in($keys)],
            'is_active' => ['required', 'boolean'],
        ]);

        return [
            'title' => trim((string) $valid['title']),
            'body' => trim((string) $valid['body']),
            'module_key' => (string) $valid['module_key'],
            'is_active' => (bool) $valid['is_active'],
        ];
    }

    private function assertSameChurch(AppNovelty $appNovelty): void
    {
        $churchId = $this->currentChurchId();
        abort_unless($churchId !== null && (int) $appNovelty->church_id === $churchId, 404);
    }

    /**
     * @return array{
     *     id: int,
     *     title: string,
     *     body: string,
     *     module_key: string,
     *     module_label: string,
     *     route_name: string,
     *     is_active: bool,
     *     published_at: string|null,
     *     created_at: string|null,
     *     author_name: string|null
     * }
     */
    private function serialize(AppNovelty $row): array
    {
        $module = AppNoveltyModules::findAny((string) $row->module_key);

        return [
            'id' => (int) $row->id,
            'title' => (string) $row->title,
            'body' => (string) $row->body,
            'module_key' => (string) $row->module_key,
            'module_label' => $module['label'] ?? (string) $row->module_key,
            'route_name' => (string) $row->route_name,
            'is_active' => (bool) $row->is_active,
            'published_at' => $row->published_at?->toIso8601String(),
            'created_at' => $row->created_at?->toIso8601String(),
            'author_name' => $row->author?->name,
        ];
    }
}
