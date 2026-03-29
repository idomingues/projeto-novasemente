<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Pastor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PastorController extends Controller
{
    private function currentChurchId(): ?int
    {
        $workingChurchId = request()->session()->get('working_church_id');
        if ($workingChurchId) {
            $church = Church::where('id', $workingChurchId)->where('active', true)->first();
            if ($church) {
                return (int) $church->id;
            }
        }

        return Church::where('active', true)->orderBy('name')->value('id');
    }

    private function deleteStoredPhoto(?string $photoPath): void
    {
        if (! $photoPath || ! str_starts_with($photoPath, '/storage/')) {
            return;
        }
        $relative = ltrim(substr($photoPath, strlen('/storage/')), '/');
        if ($relative !== '') {
            Storage::disk('public')->delete($relative);
        }
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Pastor::class);

        $churchId = $this->currentChurchId();
        $user = $request->user();
        $canManage = $user
            && ($user->hasAnyRole(['super_admin', 'admin']) || $user->can('pastors.manage'));

        $pastors = Pastor::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn (Pastor $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'bio' => $p->bio,
                'photo_path' => $p->photo_path,
                'sort_order' => $p->sort_order,
            ])
            ->values()
            ->all();

        return Inertia::render('Pastors/Index', [
            'pastors' => $pastors,
            'canManage' => $canManage,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Pastor::class);

        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('pastors.index')->with('error', 'Nenhuma igreja ativa.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:20000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['required', 'image', 'max:4096'],
        ]);

        $path = $request->file('photo')->store('pastors', 'public');
        $photoUrl = '/storage/'.$path;

        Pastor::create([
            'church_id' => $churchId,
            'name' => $data['name'],
            'bio' => $data['bio'] ?? null,
            'photo_path' => $photoUrl,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return redirect()->route('pastors.index');
    }

    public function update(Request $request, Pastor $pastor): RedirectResponse
    {
        $this->authorize('update', $pastor);

        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'bio' => ['nullable', 'string', 'max:20000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'photo' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('photo')) {
            $this->deleteStoredPhoto($pastor->photo_path);
            $path = $request->file('photo')->store('pastors', 'public');
            $pastor->photo_path = '/storage/'.$path;
        }

        $pastor->name = $data['name'];
        $pastor->bio = $data['bio'] ?? null;
        $pastor->sort_order = $data['sort_order'] ?? 0;
        $pastor->save();

        return redirect()->route('pastors.index');
    }

    public function destroy(Pastor $pastor): RedirectResponse
    {
        $this->authorize('delete', $pastor);

        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $pastor->church_id !== (int) $churchId) {
            abort(403);
        }

        $this->deleteStoredPhoto($pastor->photo_path);
        $pastor->delete();

        return redirect()->route('pastors.index');
    }
}
