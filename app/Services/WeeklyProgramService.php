<?php

namespace App\Services;

use App\Models\Church;
use App\Models\WeeklyProgram;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WeeklyProgramService
{
    /**
     * Quando não há end_time, o fim é o início do próximo item do dia —
     * mas só até este teto. Evita «Em andamento» por horas (ex.: culto 12h
     * até a classe das 15h).
     */
    private const MAX_INFERRED_DURATION_MINUTES = 90;

    public function __construct(
        private SabbathSunsetService $sunsetService,
    ) {}

    /**
     * Itens ativos da programação semanal (agenda / Horários).
     * Por padrão exclui pôr do sol — esse conteúdo fica na home.
     *
     * @return list<array<string, mixed>>
     */
    public function agendaRows(?Church $church, bool $includeSunset = false): array
    {
        return $this->activeForChurch($church)
            ->when(
                ! $includeSunset,
                fn (Collection $items) => $items->reject(fn (WeeklyProgram $item) => $item->isSunset())
            )
            ->map(fn (WeeklyProgram $item) => $this->toAgendaRow($item))
            ->values()
            ->all();
    }

    /**
     * Cards da home: itens de hoje ainda relevantes (em andamento ou futuros).
     * «Em andamento» só quando o fim é identificável (end_time ou início do próximo,
     * com teto de duração quando o próximo fica longe).
     *
     * @return list<array<string, mixed>>
     */
    public function homeCards(?Church $church): array
    {
        $timezone = (string) config('sabbath.timezone', 'America/Sao_Paulo');
        $now = Carbon::now($timezone);
        $todayDow = (int) $now->dayOfWeek;
        $dayStart = $now->copy()->startOfDay();

        $candidates = $this->activeForChurch($church)
            ->filter(fn (WeeklyProgram $item) => $item->show_on_home)
            ->filter(fn (WeeklyProgram $item) => (int) $item->day_of_week === $todayDow)
            ->reject(fn (WeeklyProgram $item) => $this->isHiddenFromHomeCard($item, $now));

        if ($candidates->isEmpty()) {
            return [];
        }

        $timed = $candidates
            ->map(fn (WeeklyProgram $item) => [
                'item' => $item,
                'at' => $this->occurrenceOnDate($item, $dayStart, $timezone),
            ])
            ->filter(fn (array $row) => $row['at'] instanceof Carbon)
            ->sortBy(fn (array $row) => $row['at']->getTimestamp())
            ->values();

        $starts = $timed->map(fn (array $row) => $row['at'])->all();

        $visible = [];
        foreach ($timed as $index => $row) {
            /** @var WeeklyProgram $item */
            $item = $row['item'];
            /** @var Carbon $at */
            $at = $row['at'];
            $endsAt = $this->resolveEndsAt($item, $dayStart, $timezone, $starts, $index);

            $isOngoing = $endsAt instanceof Carbon
                && $at->lte($now)
                && $endsAt->gt($now);
            $isUpcoming = $at->gt($now);

            if (! $isOngoing && ! $isUpcoming) {
                continue;
            }

            $card = $this->toHomeCard($item);
            if ($card === null) {
                continue;
            }

            $card['is_ongoing'] = $isOngoing;
            $card['is_next'] = false;
            $visible[] = $card;
        }

        $markedNext = false;
        foreach ($visible as $i => $card) {
            if ($card['is_ongoing']) {
                continue;
            }
            $visible[$i]['is_next'] = ! $markedNext;
            $markedNext = true;
        }

        return $visible;
    }

    /**
     * Temporário: em julho/2026 o Culto de Oração não aparece no card da home.
     */
    private function isHiddenFromHomeCard(WeeklyProgram $item, Carbon $now): bool
    {
        if ((int) $now->year !== 2026 || (int) $now->month !== 7) {
            return false;
        }

        return mb_strtoupper(trim((string) $item->title), 'UTF-8') === 'CULTO DE ORAÇÃO';
    }

    /**
     * Fim identificável: end_time explícito; senão o início do próximo item do dia,
     * limitado a {@see MAX_INFERRED_DURATION_MINUTES} a partir do início deste item.
     *
     * @param  list<Carbon>  $starts
     */
    private function resolveEndsAt(
        WeeklyProgram $item,
        Carbon $dayStart,
        string $timezone,
        array $starts,
        int $index,
    ): ?Carbon {
        $explicit = $this->occurrenceEndOnDate($item, $dayStart, $timezone);
        if ($explicit instanceof Carbon) {
            return $explicit;
        }

        $nextStart = $starts[$index + 1] ?? null;
        if (! ($nextStart instanceof Carbon)) {
            return null;
        }

        $at = $starts[$index] ?? null;
        if (! ($at instanceof Carbon)) {
            return $nextStart->copy();
        }

        $capped = $at->copy()->addMinutes(self::MAX_INFERRED_DURATION_MINUTES);

        return $nextStart->lte($capped) ? $nextStart->copy() : $capped;
    }

    private function occurrenceEndOnDate(WeeklyProgram $item, Carbon $date, string $timezone): ?Carbon
    {
        $time = $this->fixedEndTime($item);
        if ($time === null) {
            return null;
        }

        $day = $date->copy()->timezone($timezone)->startOfDay();

        return $day->setTimeFromTimeString($time);
    }

    private function fixedEndTime(WeeklyProgram $item): ?string
    {
        if ($item->end_time === null || trim((string) $item->end_time) === '') {
            return null;
        }

        try {
            return Carbon::parse($item->end_time)->format('H:i:s');
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return Collection<int, WeeklyProgram>
     */
    public function activeForChurch(?Church $church): Collection
    {
        if ($church === null) {
            return collect();
        }

        return WeeklyProgram::query()
            ->where('church_id', $church->id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('day_of_week')
            ->orderBy('id')
            ->get();
    }

    private function occurrenceOnDate(WeeklyProgram $item, Carbon $date, string $timezone): ?Carbon
    {
        $day = $date->copy()->timezone($timezone)->startOfDay();

        if ($item->isSunset()) {
            $sunset = $this->sunsetService->sunsetForDate($day->toDateString(), $timezone);

            return $sunset?->copy();
        }

        $time = $this->fixedStartTime($item);
        if ($time === null) {
            return null;
        }

        return $day->setTimeFromTimeString($time);
    }

    private function fixedStartTime(WeeklyProgram $item): ?string
    {
        if ($item->start_time !== null && trim((string) $item->start_time) !== '') {
            try {
                return Carbon::parse($item->start_time)->format('H:i:s');
            } catch (\Throwable) {
                // continua para display_time
            }
        }

        $display = trim((string) ($item->display_time ?? ''));
        if ($display === '') {
            return null;
        }

        if (preg_match('/(\d{1,2}):(\d{2})/', $display, $m)) {
            return sprintf('%02d:%02d:00', (int) $m[1], (int) $m[2]);
        }

        if (preg_match('/(\d{1,2})\s*h\s*(\d{2})?/i', $display, $m)) {
            return sprintf('%02d:%02d:00', (int) $m[1], isset($m[2]) ? (int) $m[2] : 0);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toAgendaRow(WeeklyProgram $item): array
    {
        $when = $item->when_label;
        $displayTime = $this->resolveDisplayTime($item);

        if ($item->isSunset()) {
            if ($displayTime !== null) {
                $when = trim($item->when_label.' '.$displayTime);
            }
        }

        return [
            'id' => $item->id,
            'when' => $when,
            'when_label' => $item->when_label,
            'display_time' => $displayTime,
            'title' => $item->title,
            'body' => $item->body,
            'lines' => is_array($item->lines) ? array_values($item->lines) : null,
            'day_of_week' => $item->day_of_week,
            'day_name' => WeeklyProgram::dayName($item->day_of_week),
            'time_mode' => $item->time_mode,
            'home_message' => $item->home_message,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function toHomeCard(WeeklyProgram $item): ?array
    {
        $timeDisplay = $this->resolveDisplayTime($item);
        if ($timeDisplay === null || $timeDisplay === '') {
            return null;
        }

        $title = $item->title;
        if ($title === null || trim($title) === '') {
            $lines = is_array($item->lines) ? $item->lines : [];
            $title = $lines[0] ?? $item->when_label;
        }

        $subtitle = $item->when_label;
        if ($item->isSunset()) {
            $subtitle = $item->day_of_week === Carbon::FRIDAY
                ? 'Pôr do sol de sexta'
                : ($item->day_of_week === Carbon::SATURDAY
                    ? 'Pôr do sol de sábado'
                    : 'Pôr do sol');
        }

        $imageUrl = trim((string) ($item->image_url ?? ''));
        if ($imageUrl === '' && $item->isSunset()) {
            $imageUrl = (string) config('sabbath.banner_image', '/images/sabbath-sunset-bg.jpg');
        }

        return [
            'id' => $item->id,
            'variant' => $item->isSunset() ? 'sunset' : 'fixed',
            'title' => $title,
            'subtitle' => $subtitle,
            'time_display' => $timeDisplay,
            'day_label' => WeeklyProgram::dayName($item->day_of_week),
            'message' => $item->home_message
                ?: ($item->body ? \Illuminate\Support\Str::limit(strip_tags($item->body), 72) : 'Programação semanal'),
            'image_url' => $imageUrl !== '' ? $imageUrl : null,
            'body' => $item->body,
            'lines' => is_array($item->lines) ? array_values($item->lines) : null,
        ];
    }

    private function resolveDisplayTime(WeeklyProgram $item): ?string
    {
        if ($item->isSunset()) {
            return $this->resolveSunsetTime($item->day_of_week);
        }

        $display = trim((string) ($item->display_time ?? ''));
        if ($display !== '') {
            return $display;
        }

        if ($item->start_time === null) {
            return null;
        }

        try {
            return Carbon::parse($item->start_time)->format('H:i');
        } catch (\Throwable) {
            return null;
        }
    }

    private function resolveSunsetTime(int $dayOfWeek): ?string
    {
        $timezone = (string) config('sabbath.timezone', 'America/Sao_Paulo');
        $now = Carbon::now($timezone);
        $date = $now->copy()->startOfWeek(Carbon::SUNDAY)->addDays($dayOfWeek);

        // Se o dia desta semana já passou, usa a próxima ocorrência (alinha com o card da home).
        $candidate = $date->copy()->endOfDay();
        if ($candidate->lt($now)) {
            $date->addWeek();
        }

        $sunset = $this->sunsetService->sunsetForDate($date->toDateString(), $timezone);

        return $sunset?->format('H:i');
    }
}
