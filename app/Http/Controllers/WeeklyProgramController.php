<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreWeeklyProgramRequest;
use App\Http\Requests\UpdateWeeklyProgramRequest;
use App\Http\Support\ListModalRedirect;
use App\Models\Church;
use App\Models\WeeklyProgram;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WeeklyProgramController extends Controller
{
    private function currentChurchId(): ?int
    {
        return Church::resolveWorkingId(request());
    }

    public function index(Request $request): Response
    {
        $churchId = $this->currentChurchId();
        $items = WeeklyProgram::query()
            ->when($churchId !== null, fn ($q) => $q->where('church_id', $churchId))
            ->when($churchId === null, fn ($q) => $q->whereRaw('1 = 0'))
            ->orderBy('sort_order')
            ->orderBy('day_of_week')
            ->orderBy('id')
            ->get()
            ->map(fn (WeeklyProgram $item) => $this->serialize($item))
            ->values()
            ->all();

        return Inertia::render('Programacao/Index', [
            'items' => $items,
            'dayOptions' => WeeklyProgram::dayOptions(),
            'timeModes' => [
                WeeklyProgram::TIME_MODE_FIXED => 'Horário fixo',
                WeeklyProgram::TIME_MODE_SUNSET => 'Pôr do sol (dinâmico)',
            ],
            'canManage' => $request->user()?->can('programacao.manage') ?? false,
        ]);
    }

    public function store(StoreWeeklyProgramRequest $request)
    {
        $churchId = $this->currentChurchId();
        if ($churchId === null) {
            return redirect()->route('programacao.index')
                ->with('error', 'Nenhuma igreja ativa. Selecione uma igreja para trabalhar.');
        }

        $data = $this->normalized($request->validated());
        $item = WeeklyProgram::create(array_merge($data, [
            'church_id' => $churchId,
            'sort_order' => $data['sort_order'] ?? ((int) WeeklyProgram::query()->where('church_id', $churchId)->max('sort_order') + 10),
        ]));

        return ListModalRedirect::toIndexEdit('programacao.index', $item, 'Item de programação criado com sucesso!');
    }

    public function update(UpdateWeeklyProgramRequest $request, WeeklyProgram $weeklyProgram)
    {
        $this->assertSameChurch($weeklyProgram);
        $weeklyProgram->update($this->normalized($request->validated()));

        return ListModalRedirect::toIndexEdit('programacao.index', $weeklyProgram, 'Item de programação atualizado com sucesso!');
    }

    public function destroy(WeeklyProgram $weeklyProgram)
    {
        $this->assertSameChurch($weeklyProgram);
        $weeklyProgram->delete();

        return redirect()->route('programacao.index')->with('success', 'Item de programação excluído com sucesso!');
    }

    private function assertSameChurch(WeeklyProgram $item): void
    {
        $churchId = $this->currentChurchId();
        abort_unless($churchId !== null && (int) $item->church_id === $churchId, 404);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalized(array $data): array
    {
        $data['sort_order'] = isset($data['sort_order']) ? (int) $data['sort_order'] : 0;
        $data['show_on_home'] = (bool) ($data['show_on_home'] ?? true);
        $data['is_active'] = (bool) ($data['is_active'] ?? true);
        $data['lines'] = isset($data['lines']) && is_array($data['lines']) && $data['lines'] !== []
            ? array_values($data['lines'])
            : null;

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(WeeklyProgram $item): array
    {
        $start = null;
        $end = null;
        try {
            $start = $item->start_time ? Carbon::parse($item->start_time)->format('H:i') : null;
            $end = $item->end_time ? Carbon::parse($item->end_time)->format('H:i') : null;
        } catch (\Throwable) {
            $start = $item->start_time;
            $end = $item->end_time;
        }

        return [
            'id' => $item->id,
            'day_of_week' => $item->day_of_week,
            'day_name' => WeeklyProgram::dayName($item->day_of_week),
            'when_label' => $item->when_label,
            'title' => $item->title,
            'body' => $item->body,
            'lines' => is_array($item->lines) ? array_values($item->lines) : [],
            'time_mode' => $item->time_mode,
            'start_time' => $start,
            'end_time' => $end,
            'display_time' => $item->display_time,
            'home_message' => $item->home_message,
            'image_url' => $item->image_url,
            'show_on_home' => (bool) $item->show_on_home,
            'is_active' => (bool) $item->is_active,
            'sort_order' => (int) $item->sort_order,
        ];
    }
}
