<?php

namespace App\Http\Controllers;

use App\Models\Church;
use App\Models\Room;
use App\Models\RoomBooking;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class RoomBookingController extends Controller
{
    private function churchId(Request $request): ?int
    {
        return Church::resolveWorkingId($request)
            ?? Church::where('active', true)->orderBy('name')->value('id');
    }

    private function canViewBookings(Request $request): bool
    {
        $u = $request->user();

        return $u && ($u->can('rooms.view') || $u->can('rooms.manage') || $u->can('rooms.schedule'));
    }

    private function redirectIfRoomBookingsMissing(): ?RedirectResponse
    {
        if (! Schema::hasTable('room_bookings')) {
            return redirect()->route('mobile.home')->with(
                'error',
                'O agendamento de salas ainda não está disponível. Execute na raiz do projeto: php artisan migrate'
            );
        }

        return null;
    }

    public function index(Request $request): Response|RedirectResponse
    {
        abort_unless($this->canViewBookings($request), 403);

        if ($missing = $this->redirectIfRoomBookingsMissing()) {
            return $missing;
        }

        $churchId = $this->churchId($request);
        if ($churchId === null) {
            abort(404, 'Nenhuma igreja ativa.');
        }

        $user = $request->user();
        $view = $request->query('view', 'week');
        if (! in_array($view, ['day', 'week', 'month'], true)) {
            $view = 'week';
        }

        $anchor = Carbon::parse($request->query('date', now()->toDateString()))->startOfDay();

        $rangeStart = match ($view) {
            'day' => $anchor->copy(),
            'week' => $anchor->copy()->startOfWeek(Carbon::MONDAY),
            'month' => $anchor->copy()->startOfMonth(),
        };

        $rangeEnd = match ($view) {
            'day' => $anchor->copy()->endOfDay(),
            'week' => $anchor->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay(),
            'month' => $anchor->copy()->endOfMonth()->endOfDay(),
        };

        $roomFilterId = $request->query('room');
        $roomFilterId = ($roomFilterId !== null && $roomFilterId !== '')
            ? (int) $roomFilterId
            : null;
        if ($roomFilterId !== null) {
            $roomOk = Room::query()->where('church_id', $churchId)->whereKey($roomFilterId)->exists();
            if (! $roomOk) {
                $roomFilterId = null;
            }
        }

        $bookingCountsByRoom = RoomBooking::query()
            ->where('church_id', $churchId)
            ->where('starts_at', '<', $rangeEnd)
            ->where('ends_at', '>', $rangeStart)
            ->selectRaw('room_id, COUNT(*) as total')
            ->groupBy('room_id')
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->room_id => (int) $row->total])
            ->all();

        $totalBookingsInRange = array_sum($bookingCountsByRoom);

        $bookings = RoomBooking::query()
            ->where('church_id', $churchId)
            ->where('starts_at', '<', $rangeEnd)
            ->where('ends_at', '>', $rangeStart)
            ->when($roomFilterId !== null, fn ($q) => $q->where('room_id', $roomFilterId))
            ->with(['room:id,name,floor', 'user:id,name'])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (RoomBooking $b) => [
                'id' => $b->id,
                'title' => $b->title,
                'notes' => $b->notes,
                'starts_at' => $b->starts_at->toIso8601String(),
                'ends_at' => $b->ends_at->toIso8601String(),
                'room' => ['id' => $b->room->id, 'name' => $b->room->name, 'floor' => $b->room->floor],
                'user' => ['id' => $b->user->id, 'name' => $b->user->name],
                'is_mine' => $user->id === $b->user_id,
            ]);

        $rooms = Room::query()
            ->where('church_id', $churchId)
            ->orderBy('name')
            ->get(['id', 'name', 'floor', 'location']);

        return Inertia::render('Rooms/Schedule', [
            'view' => $view,
            'anchorDate' => $anchor->toDateString(),
            'rangeStart' => $rangeStart->toIso8601String(),
            'rangeEnd' => $rangeEnd->toIso8601String(),
            'bookings' => $bookings,
            'rooms' => $rooms,
            'roomFilter' => $roomFilterId,
            'bookingCountsByRoom' => $bookingCountsByRoom,
            'totalBookingsInRange' => $totalBookingsInRange,
            'canSchedule' => $user->can('rooms.schedule'),
            'canManageRooms' => $user->can('rooms.manage'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if ($missing = $this->redirectIfRoomBookingsMissing()) {
            return $missing;
        }

        $churchId = $this->churchId($request);
        if ($churchId === null) {
            return redirect()->route('room-bookings.index')->with('error', 'Nenhuma igreja ativa.');
        }

        $validated = $request->validate([
            'room_id' => ['required', 'exists:rooms,id'],
            'title' => ['required', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);

        $room = Room::query()->findOrFail((int) $validated['room_id']);
        if ((int) $room->church_id !== (int) $churchId) {
            abort(403);
        }

        $starts = Carbon::parse($validated['starts_at']);
        $ends = Carbon::parse($validated['ends_at']);

        if ($this->hasOverlap($room->id, $starts, $ends)) {
            return back()->withErrors(['starts_at' => 'Este horário sobrepõe outro agendamento nesta sala.'])->withInput();
        }

        $creator = $request->user();
        RoomBooking::create([
            'church_id' => $churchId,
            'room_id' => $room->id,
            'user_id' => $creator->id,
            'title' => $validated['title'],
            'responsible_name' => $creator->name,
            'notes' => $validated['notes'] ?? null,
            'starts_at' => $starts,
            'ends_at' => $ends,
        ]);

        return redirect()->route('room-bookings.index', $this->roomBookingIndexParams($request, $starts->toDateString()))
            ->with('success', 'Agendamento criado.');
    }

    public function update(Request $request, RoomBooking $roomBooking): RedirectResponse
    {
        if ($missing = $this->redirectIfRoomBookingsMissing()) {
            return $missing;
        }

        $churchId = $this->churchId($request);
        if ($churchId === null || (int) $roomBooking->church_id !== (int) $churchId) {
            abort(403);
        }

        $user = $request->user();
        if (! $user->can('rooms.manage') && (! $user->can('rooms.schedule') || $roomBooking->user_id !== $user->id)) {
            abort(403);
        }

        $validated = $request->validate([
            'room_id' => ['required', 'exists:rooms,id'],
            'title' => ['required', 'string', 'max:200'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);

        $room = Room::query()->findOrFail((int) $validated['room_id']);
        if ((int) $room->church_id !== (int) $churchId) {
            abort(403);
        }

        $starts = Carbon::parse($validated['starts_at']);
        $ends = Carbon::parse($validated['ends_at']);

        if ($this->hasOverlap($room->id, $starts, $ends, $roomBooking->id)) {
            return back()->withErrors(['starts_at' => 'Este horário sobrepõe outro agendamento nesta sala.'])->withInput();
        }

        $roomBooking->update([
            'room_id' => $room->id,
            'title' => $validated['title'],
            'notes' => $validated['notes'] ?? null,
            'starts_at' => $starts,
            'ends_at' => $ends,
        ]);

        return redirect()->route('room-bookings.index', $this->roomBookingIndexParams($request, $starts->toDateString()))
            ->with('success', 'Agendamento atualizado.');
    }

    public function destroy(Request $request, RoomBooking $roomBooking): RedirectResponse
    {
        if ($missing = $this->redirectIfRoomBookingsMissing()) {
            return $missing;
        }

        $churchId = $this->churchId($request);
        if ($churchId === null || (int) $roomBooking->church_id !== (int) $churchId) {
            abort(403);
        }

        $user = $request->user();
        if (! $user->can('rooms.manage') && (! $user->can('rooms.schedule') || $roomBooking->user_id !== $user->id)) {
            abort(403);
        }

        $roomBooking->delete();

        return redirect()->route(
            'room-bookings.index',
            $this->roomBookingIndexParams($request, (string) $request->query('date', now()->toDateString()))
        )->with('success', 'Agendamento removido.');
    }

    /**
     * @return array<string, mixed>
     */
    private function roomBookingIndexParams(Request $request, string $date): array
    {
        $params = [
            'view' => $request->query('view', 'week'),
            'date' => $date,
        ];
        if ($request->filled('room')) {
            $params['room'] = $request->query('room');
        }

        return $params;
    }

    private function hasOverlap(int $roomId, Carbon $starts, Carbon $ends, ?int $exceptId = null): bool
    {
        return RoomBooking::query()
            ->where('room_id', $roomId)
            ->when($exceptId, fn ($q) => $q->where('id', '!=', $exceptId))
            ->where('starts_at', '<', $ends)
            ->where('ends_at', '>', $starts)
            ->exists();
    }
}
