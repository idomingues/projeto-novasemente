<?php

namespace App\Http\Controllers;

use App\Models\AppVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class AppVersionController extends Controller
{
    private function isAdmin(Request $request): bool
    {
        $user = $request->user();

        return $user && ($user->hasRole('admin') || $user->hasRole('super_admin'));
    }

    public function index(Request $request): Response
    {
        abort_unless($this->isAdmin($request), 403);

        if (! Schema::hasTable('app_versions')) {
            return Inertia::render('AppVersions/Index', [
                'versions' => [],
                'latestVersion' => null,
            ]);
        }

        $versions = AppVersion::query()
            ->orderByDesc('released_at')
            ->orderByDesc('id')
            ->get(['id', 'version', 'released_at', 'notes', 'created_at']);

        $latest = $versions->first();

        return Inertia::render('AppVersions/Index', [
            'versions' => $versions->map(fn (AppVersion $v) => [
                'id' => $v->id,
                'version' => $v->version,
                'releasedAt' => $v->released_at?->toDateTimeString(),
                'notes' => $v->notes,
                'createdAt' => $v->created_at?->toDateTimeString(),
            ])->values(),
            'latestVersion' => $latest?->version,
        ]);
    }

    public function store(Request $request)
    {
        abort_unless($this->isAdmin($request), 403);
        abort_unless(Schema::hasTable('app_versions'), 400, 'Tabela de versões ainda não foi criada.');

        $valid = $request->validate([
            'version' => ['required', 'string', 'max:50', 'unique:app_versions,version'],
            'released_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        AppVersion::create([
            'version' => $valid['version'],
            'released_at' => ! empty($valid['released_at']) ? now()->parse($valid['released_at']) : now(),
            'notes' => $valid['notes'] ?? null,
        ]);

        return redirect()->route('app-versions.index')->with('success', 'Versão adicionada.');
    }
}
