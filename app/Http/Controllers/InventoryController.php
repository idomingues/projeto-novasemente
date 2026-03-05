<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Http\Requests\StoreInventoryItemRequest;
use App\Http\Requests\UpdateInventoryItemRequest;
use Illuminate\Http\Request;
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
            ->when($churchId, fn ($q) => $q->where('church_id', $churchId));

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
        $item = InventoryItem::create(array_merge($request->validated(), [
            'church_id' => $this->currentChurchId(),
        ]));
        InventoryMovement::create([
            'inventory_item_id' => $item->id,
            'type' => InventoryMovement::TYPE_ENTRY,
            'to_location' => $item->location,
            'notes' => 'Cadastro inicial',
            'user_id' => $request->user()?->id,
        ]);
        return redirect()->route('inventory.index')->with('success', 'Item cadastrado com sucesso!');
    }

    public function update(UpdateInventoryItemRequest $request, InventoryItem $item)
    {
        $item->update($request->validated());
        return redirect()->route('inventory.index')->with('success', 'Item atualizado com sucesso!');
    }

    public function destroy(InventoryItem $item)
    {
        $item->delete();
        return redirect()->route('inventory.index')->with('success', 'Item removido com sucesso!');
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
