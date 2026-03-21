<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreInventoryItemRequest;
use App\Http\Requests\UpdateInventoryItemRequest;
use App\Models\Church;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $query = InventoryItem::query()
            ->withCount('movements')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $search = $request->input('search');
        if ($search && is_string($search)) {
            $term = trim($search);
            $query->where(function ($q) use ($term) {
                $q->where('barcode', 'like', '%' . $term . '%')
                    ->orWhere('name', 'like', '%' . $term . '%')
                    ->orWhere('serial_number', 'like', '%' . $term . '%');
            });
        }

        $items = $query->orderBy('name')->get();

        return Inertia::render('Inventory/Index', [
            'items' => $items,
            'filters' => ['search' => $search],
        ]);
    }

    public function store(StoreInventoryItemRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('inventory.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        $validated = $request->validated();
        unset($validated['photo'], $validated['return_to']);
        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('inventory/photos', 'public');
        }
        $item = InventoryItem::create(array_merge($validated, [
            'church_id' => $churchId,
            'photo_path' => $photoPath,
        ]));
        InventoryMovement::create([
            'inventory_item_id' => $item->id,
            'type' => InventoryMovement::TYPE_ENTRY,
            'to_location' => $item->location,
            'notes' => 'Cadastro inicial',
            'user_id' => $request->user()?->id,
        ]);

        $redirect = $request->input('return_to') === 'mobile'
            ? route('mobile.inventory')
            : route('inventory.index');

        return redirect($redirect)->with('success', 'Item cadastrado com sucesso!');
    }

    public function update(UpdateInventoryItemRequest $request, InventoryItem $item)
    {
        $validated = $request->validated();
        unset($validated['photo']);
        if ($request->hasFile('photo')) {
            if ($item->photo_path) {
                Storage::disk('public')->delete($item->photo_path);
            }
            $validated['photo_path'] = $request->file('photo')->store('inventory/photos', 'public');
        }
        $item->update($validated);

        return redirect()->route('inventory.index')->with('success', 'Item atualizado com sucesso!');
    }

    public function destroy(InventoryItem $item)
    {
        if ($item->photo_path) {
            Storage::disk('public')->delete($item->photo_path);
        }
        $item->delete();

        return redirect()->route('inventory.index')->with('success', 'Item removido com sucesso!');
    }

    public function lookup(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('inventory.view') || $request->user()?->can('inventory.manage'), 403);

        $barcode = trim((string) $request->query('barcode', ''));
        if ($barcode === '') {
            return response()->json(['found' => false, 'message' => 'Informe o código de barras.']);
        }

        $churchId = $this->currentChurchId();
        $normalized = mb_strtolower(trim($barcode));

        $item = InventoryItem::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->whereRaw('LOWER(TRIM(barcode)) = ?', [$normalized])
            ->withCount('movements')
            ->first();

        if (! $item) {
            return response()->json([
                'found' => false,
                'barcode' => $barcode,
                'message' => 'Nenhum item encontrado com este código.',
            ]);
        }

        return response()->json([
            'found' => true,
            'item' => [
                'id' => $item->id,
                'barcode' => $item->barcode,
                'name' => $item->name,
                'description' => $item->description,
                'location' => $item->location,
                'category' => $item->category,
                'brand' => $item->brand,
                'status' => $item->status,
                'photo_url' => $item->photo_url,
                'movements_count' => $item->movements_count,
            ],
        ]);
    }

    public function mobile(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $query = InventoryItem::query()
            ->withCount('movements')
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'));

        $search = $request->input('search');
        if ($search && is_string($search)) {
            $term = trim($search);
            $query->where(function ($q) use ($term) {
                $q->where('barcode', 'like', '%'.$term.'%')
                    ->orWhere('name', 'like', '%'.$term.'%')
                    ->orWhere('serial_number', 'like', '%'.$term.'%');
            });
        }

        $items = $query->orderBy('name')->limit(200)->get();

        return Inertia::render('Mobile/Inventory', [
            'items' => $items,
            'filters' => ['search' => $search],
            'canManage' => $request->user()?->can('inventory.manage') ?? false,
        ]);
    }

    public function history(InventoryItem $item)
    {
        $item->load(['movements' => fn ($q) => $q->with('user:id,name')]);
        return response()->json([
            'item' => $item->only(['id', 'barcode', 'name', 'location']),
            'movements' => $item->movements->map(fn ($m) => [
                'id' => $m->id,
                'type' => $m->type,
                'type_label' => InventoryMovement::TYPES[$m->type] ?? $m->type,
                'from_location' => $m->from_location,
                'to_location' => $m->to_location,
                'notes' => $m->notes,
                'user_name' => $m->user?->name,
                'created_at' => $m->created_at->toIso8601String(),
            ]),
        ]);
    }
}
