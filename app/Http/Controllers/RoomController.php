<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Room;
use App\Http\Requests\StoreRoomRequest;
use App\Http\Requests\UpdateRoomRequest;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::where('active', true)->orderBy('name')->value('id');
    }

    public function index(): Response
    {
        $churchId = $this->currentChurchId();
        $order = ['terreo', 'mezanino', 'primeiro', 'segundo', 'terceiro'];
        $rooms = Room::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('name')
            ->get()
            ->sortBy(fn (Room $r) => array_search($r->floor, $order, true))
            ->values();

        $byFloor = collect(Room::FLOORS)->keys()->mapWithKeys(fn (string $key) => [
            $key => [
                'label' => Room::FLOORS[$key],
                'rooms' => $rooms->where('floor', $key)->values()->all(),
            ],
        ])->all();

        return Inertia::render('Rooms/Index', [
            'rooms' => $rooms->all(),
            'byFloor' => $byFloor,
            'floors' => Room::FLOORS,
        ]);
    }

    public function store(StoreRoomRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('rooms.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }
        Room::create(array_merge($request->validated(), [
            'church_id' => $churchId,
        ]));
        return redirect()->route('rooms.index')->with('success', 'Sala criada com sucesso!');
    }

    public function update(UpdateRoomRequest $request, Room $room)
    {
        $room->update($request->validated());
        return redirect()->route('rooms.index')->with('success', 'Sala atualizada com sucesso!');
    }

    public function destroy(Room $room)
    {
        $room->delete();
        return redirect()->route('rooms.index')->with('success', 'Sala removida com sucesso!');
    }
}
