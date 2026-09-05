<?php

namespace App\Services;

use App\Models\SaturdayProgram;
use App\Support\StorageUrl;
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
     * @return array{status: string, message?: string, id?: int, title?: string, saturday_date?: string, pdf_url?: string|null}
     */
    public function mobilePayload(?int $churchId): array
    {
        $program = $this->currentForChurch($churchId);

        if ($program === null || $program->pdf_path === '' || $program->pdf_path === null) {
            return [
                'status' => 'waiting',
                'message' => self::WAITING_MESSAGE,
            ];
        }

        $title = trim((string) ($program->title ?? ''));
        if ($title === '') {
            $title = 'Programação do Sábado';
        }

        return [
            'status' => 'available',
            'id' => $program->id,
            'title' => $title,
            'saturday_date' => $program->saturday_date?->toDateString(),
            'pdf_url' => StorageUrl::publicMediaUrl($program->pdf_path),
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
