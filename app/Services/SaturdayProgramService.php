<?php

namespace App\Services;

use App\Models\SaturdayProgram;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class SaturdayProgramService
{
    public const EXPIRE_HOUR = 15;

    public const WAITING_MESSAGE = 'Aguarde a publicação do próximo sábado.';

    public function timezone(): string
    {
        return (string) config('app.timezone', 'America/Sao_Paulo');
    }

    public function expiresAt(Carbon|string $saturdayDate, ?string $timezone = null): Carbon
    {
        $tz = $timezone ?? $this->timezone();

        return Carbon::parse($saturdayDate, $tz)->startOfDay()->setTime(self::EXPIRE_HOUR, 0, 0);
    }

    public function isWithinWindow(SaturdayProgram $program, ?Carbon $now = null): bool
    {
        if (! $program->is_active) {
            return false;
        }

        if ($program->published_at === null) {
            return false;
        }

        $tz = $this->timezone();
        $now ??= now($tz);

        if ($now->lt(Carbon::parse($program->published_at)->timezone($tz))) {
            return false;
        }

        return $now->lt($this->expiresAt($program->saturday_date, $tz));
    }

    public function hasPassedExpiry(SaturdayProgram $program, ?Carbon $now = null): bool
    {
        $tz = $this->timezone();
        $now ??= now($tz);

        return $now->gte($this->expiresAt($program->saturday_date, $tz));
    }

    public function currentForChurch(?int $churchId): ?SaturdayProgram
    {
        if ($churchId === null) {
            return null;
        }

        $now = now($this->timezone());

        return SaturdayProgram::query()
            ->where('church_id', $churchId)
            ->where('is_active', true)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', $now)
            ->orderBy('saturday_date')
            ->orderBy('id')
            ->get()
            ->first(fn (SaturdayProgram $program) => $this->isWithinWindow($program, $now));
    }

    /**
     * @return array{
     *     status: string,
     *     message?: string,
     *     id?: int,
     *     title?: string,
     *     saturday_date?: string,
     *     pdf_url?: string|null,
     *     parse_status?: string,
     *     has_schedule?: bool,
     *     schedule?: array<string, mixed>|null
     * }
     */
    public function mobilePayload(?int $churchId): array
    {
        $program = $this->currentForChurch($churchId);

        if ($program === null) {
            return [
                'status' => 'waiting',
                'message' => self::WAITING_MESSAGE,
            ];
        }

        $title = trim((string) ($program->title ?? ''));
        if ($title === '') {
            $title = 'Programação do Sábado';
        }

        $schedule = is_array($program->schedule) ? $program->schedule : null;
        $hasSchedule = $program->parse_status === SaturdayProgram::PARSE_OK
            && is_array($schedule)
            && is_array($schedule['items'] ?? null)
            && $schedule['items'] !== [];

        $pdfPath = is_string($program->pdf_path) ? trim($program->pdf_path) : '';
        $pdfUrl = null;
        if ($pdfPath !== '') {
            // Relativo ao host atual (evita 404 quando APP_URL ≠ origem do app/Capacitor).
            $pdfUrl = route('media.public', ['path' => $pdfPath], absolute: false);
        }

        if (! $hasSchedule && $pdfUrl === null) {
            return [
                'status' => 'waiting',
                'message' => self::WAITING_MESSAGE,
            ];
        }

        return [
            'status' => 'available',
            'id' => $program->id,
            'title' => $title,
            'saturday_date' => $program->saturday_date?->toDateString(),
            'pdf_url' => $pdfUrl,
            'parse_status' => $program->parse_status ?? SaturdayProgram::PARSE_PENDING,
            'has_schedule' => $hasSchedule,
            'schedule' => $hasSchedule ? $schedule : null,
        ];
    }

    /**
     * @return array{expired: int, files_deleted: int}
     */
    public function expirePastPrograms(?Carbon $now = null): array
    {
        $tz = $this->timezone();
        $now ??= now($tz);
        $expired = 0;
        $filesDeleted = 0;

        $candidates = SaturdayProgram::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        foreach ($candidates as $program) {
            if (! $this->hasPassedExpiry($program, $now)) {
                continue;
            }

            $path = is_string($program->pdf_path) ? trim($program->pdf_path) : '';
            if ($path !== '' && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                $filesDeleted++;
            }

            $program->update([
                'is_active' => false,
                'pdf_path' => '',
                'schedule' => null,
                'parse_status' => SaturdayProgram::PARSE_PENDING,
                'parsed_at' => null,
                'parse_error' => null,
            ]);
            $expired++;
        }

        return [
            'expired' => $expired,
            'files_deleted' => $filesDeleted,
        ];
    }

    public function assertSaturdayDate(string $dateYmd): void
    {
        $date = Carbon::parse($dateYmd, $this->timezone())->startOfDay();
        if ($date->dayOfWeek !== Carbon::SATURDAY) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'saturday_date' => 'A data deve ser um sábado.',
            ]);
        }
    }
}
