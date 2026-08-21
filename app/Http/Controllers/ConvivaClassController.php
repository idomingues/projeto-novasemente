<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreConvivaClassRequest;
use App\Http\Requests\UpdateConvivaClassRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\ConvivaCheckin;
use App\Models\ConvivaClass;
use App\Support\ConvivaSaturday;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConvivaClassController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    private function abortUnlessSameChurch(ConvivaClass $class): void
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null || (int) $class->church_id !== $churchId) {
            abort(404);
        }
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $tab = $request->string('tab')->toString() === 'presencas' ? 'presencas' : 'turmas';

        $classes = ConvivaClass::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('sort_order')
            ->orderBy('room_name')
            ->orderBy('teacher_name')
            ->get();

        $presenceDate = $request->string('date')->toString();
        if ($presenceDate === '' || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $presenceDate)) {
            $presenceDate = ConvivaSaturday::referenceSaturdayString();
        }

        $filterClassId = $request->integer('class_id') ?: null;

        $checkinsQuery = ConvivaCheckin::query()
            ->with(['user:id,name,email,photo_url', 'convivaClass:id,room_name,teacher_name'])
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->whereDate('checkin_date', $presenceDate)
            ->when($filterClassId, fn ($q) => $q->where('conviva_class_id', $filterClassId))
            ->orderBy('created_at');

        $checkins = $checkinsQuery->get()->map(fn (ConvivaCheckin $c) => [
            'id' => $c->id,
            'user_id' => $c->user_id,
            'user_name' => $c->user?->name ?? '—',
            'user_email' => $c->user?->email,
            'photo_url' => $c->user?->photo_url ?? null,
            'class_id' => $c->conviva_class_id,
            'room_name' => $c->convivaClass?->room_name ?? '—',
            'teacher_name' => $c->convivaClass?->teacher_name ?? '—',
            'checked_in_at' => $c->created_at?->timezone(config('app.timezone'))->format('H:i'),
        ]);

        $byClass = $checkins
            ->groupBy('class_id')
            ->map(fn ($rows, $classId) => [
                'class_id' => (int) $classId,
                'room_name' => $rows->first()['room_name'] ?? '—',
                'teacher_name' => $rows->first()['teacher_name'] ?? '—',
                'count' => $rows->count(),
                'checkins' => $rows->values()->all(),
            ])
            ->values()
            ->all();

        return Inertia::render('Conviva/Index', [
            'tab' => $tab,
            'classes' => $classes,
            'canManage' => $request->user()?->can('conviva.manage') ?? false,
            'presence' => [
                'date' => $presenceDate,
                'class_id' => $filterClassId,
                'total' => $checkins->count(),
                'by_class' => $byClass,
                'checkins' => $checkins->values()->all(),
            ],
        ]);
    }

    public function store(StoreConvivaClassRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('conviva.index')->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $data = $request->validated();
        $class = ConvivaClass::create([
            'church_id' => $churchId,
            'room_name' => $data['room_name'],
            'teacher_name' => $data['teacher_name'],
            'is_active' => $data['is_active'] ?? true,
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        return ListModalRedirect::toIndexEdit('conviva.index', $class, 'Turma CONVIVA criada com sucesso!');
    }

    public function update(UpdateConvivaClassRequest $request, ConvivaClass $convivaClass)
    {
        $this->abortUnlessSameChurch($convivaClass);

        $data = $request->validated();
        $convivaClass->update([
            'room_name' => $data['room_name'],
            'teacher_name' => $data['teacher_name'],
            'is_active' => $data['is_active'] ?? $convivaClass->is_active,
            'sort_order' => $data['sort_order'] ?? $convivaClass->sort_order,
        ]);

        return ListModalRedirect::toIndexEdit('conviva.index', $convivaClass, 'Turma CONVIVA atualizada com sucesso!');
    }

    public function destroy(ConvivaClass $convivaClass)
    {
        $this->abortUnlessSameChurch($convivaClass);

        if ($convivaClass->checkins()->exists()) {
            return redirect()
                ->route('conviva.index')
                ->with('error', 'Esta turma já tem check-ins. Desative-a em vez de excluir.');
        }

        $convivaClass->delete();

        return redirect()->route('conviva.index')->with('success', 'Turma CONVIVA removida com sucesso!');
    }
}
