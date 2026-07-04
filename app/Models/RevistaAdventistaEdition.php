<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class RevistaAdventistaEdition extends Model
{
    public const SOURCE_CPB = 'cpb';

    public const SOURCE_ACES = 'aces';

    protected $fillable = [
        'source',
        'source_edition_id',
        'cpb_edition_id',
        'year',
        'month_code',
        'month',
        'title',
        'source_cover_url',
        'cover_path',
        'source_pdf_url',
        'pdf_path',
        'pdf_cached_at',
        'cover_cached_at',
        'is_active',
        'synced_at',
    ];

    protected $casts = [
        'pdf_cached_at' => 'datetime',
        'cover_cached_at' => 'datetime',
        'synced_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    protected $attributes = [
        'source' => self::SOURCE_CPB,
    ];

    public function resolvedSourcePdfUrl(): ?string
    {
        $url = trim((string) ($this->source_pdf_url ?? ''));
        if ($url !== '' && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://'))) {
            return $url;
        }

        return null;
    }

    public function resolvedSourceCoverUrl(): ?string
    {
        $url = trim((string) ($this->source_cover_url ?? ''));
        if ($url !== '' && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://'))) {
            return $url;
        }

        return null;
    }

    public function hasLocalPdf(): bool
    {
        $path = trim(str_replace('\\', '/', (string) ($this->pdf_path ?? '')), '/');
        if ($path === '' || str_starts_with($path, 'http')) {
            return false;
        }

        return \Illuminate\Support\Facades\Storage::disk('public')->exists($path);
    }

    public function hasLocalCover(): bool
    {
        $path = trim(str_replace('\\', '/', (string) ($this->cover_path ?? '')), '/');
        if ($path === '' || str_starts_with($path, 'http')) {
            return false;
        }

        return \Illuminate\Support\Facades\Storage::disk('public')->exists($path);
    }

    public function resolvedCoverUrl(string $baseUrl): ?string
    {
        if ($this->hasLocalCover()) {
            return StorageUrl::publicMediaUrl((string) $this->cover_path);
        }

        return $this->resolvedSourceCoverUrl();
    }

    public function resolvedPdfUrl(string $baseUrl): ?string
    {
        if ($this->hasLocalPdf()) {
            return StorageUrl::publicMediaUrl((string) $this->pdf_path);
        }

        return $this->resolvedSourcePdfUrl();
    }

    public function deleteLocalAssets(): void
    {
        $coverPath = trim(str_replace('\\', '/', (string) ($this->cover_path ?? '')), '/');
        if ($coverPath !== '' && ! str_starts_with($coverPath, 'http')) {
            Storage::disk('public')->delete($coverPath);
        }

        $pdfPath = trim(str_replace('\\', '/', (string) ($this->pdf_path ?? '')), '/');
        if ($pdfPath !== '' && ! str_starts_with($pdfPath, 'http')) {
            Storage::disk('public')->delete($pdfPath);
        }
    }

    /**
     * @return array<string, string>
     */
    public static function monthLabels(): array
    {
        return [
            1 => 'Janeiro',
            2 => 'Fevereiro',
            3 => 'Março',
            4 => 'Abril',
            5 => 'Maio',
            6 => 'Junho',
            7 => 'Julho',
            8 => 'Agosto',
            9 => 'Setembro',
            10 => 'Outubro',
            11 => 'Novembro',
            12 => 'Dezembro',
        ];
    }

    public static function buildTitle(int $year, int $month): string
    {
        $label = self::monthLabels()[$month] ?? 'Mês '.$month;

        return $label.' de '.$year;
    }

    public static function storageFilename(int $year, int $month, string $extension): string
    {
        return sprintf('%d_M%02d.%s', $year, $month, ltrim($extension, '.'));
    }

    public function monthLabel(): string
    {
        return self::monthLabels()[$this->month] ?? (string) $this->month;
    }
}
