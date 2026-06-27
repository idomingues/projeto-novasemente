<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryBook extends Model
{
    public const CATEGORY_BOOKS = 'books';

    public const CATEGORY_MAGAZINES = 'magazines';

    public const CATEGORY_MEDITATION = 'meditation';

    public const CATEGORY_LESSON = 'lesson';

    public const CATEGORY_EGW = 'egw';

    protected $fillable = [
        'church_id',
        'title',
        'subtitle',
        'description',
        'category',
        'cover_path',
        'source_cover_url',
        'pdf_path',
        'source_pdf_url',
        'pdf_cached_at',
        'external_url',
        'published_at',
        'order',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'pdf_cached_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Visível na app móvel: sem data (sempre) ou com data não futura. */
    public function scopeVisibleInApp($query)
    {
        return $query
            ->where(function ($q) {
                $q->whereNull('published_at')
                    ->orWhere('published_at', '<=', now());
            });
    }

    /** Catálogo global (ex.: Ellen G. White). */
    public function scopeGlobal($query)
    {
        return $query->whereNull('church_id');
    }

    /** Livros da igreja + catálogo global EGW visível. */
    public function scopeForMobileLibrary($query, ?int $churchId)
    {
        return $query->where(function ($q) use ($churchId) {
            if ($churchId !== null) {
                $q->where('church_id', $churchId);
            }
            $q->orWhere(function ($q2) {
                $q2->whereNull('church_id')
                    ->where('category', self::CATEGORY_EGW);
            });
        });
    }

    public function isGlobalEgw(): bool
    {
        return $this->church_id === null && $this->category === self::CATEGORY_EGW;
    }

    public function resolvedSourcePdfUrl(): ?string
    {
        $url = trim((string) ($this->source_pdf_url ?? ''));
        if ($url !== '' && (str_starts_with($url, 'http://') || str_starts_with($url, 'https://'))) {
            return $url;
        }

        $path = $this->pdf_path;
        if (is_string($path) && $path !== '' && (str_starts_with($path, 'http://') || str_starts_with($path, 'https://'))) {
            return $path;
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

    public function resolvedCoverUrl(string $baseUrl): ?string
    {
        $path = $this->cover_path;
        if (empty($path)) {
            return null;
        }
        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return StorageUrl::publicMediaUrl($path);
    }

    public function resolvedPdfUrl(string $baseUrl): ?string
    {
        $path = $this->pdf_path;
        if (empty($path)) {
            return null;
        }
        if (str_starts_with($path, 'http')) {
            return $path;
        }

        return StorageUrl::publicMediaUrl($path);
    }

    public static function categories(): array
    {
        return [
            self::CATEGORY_BOOKS,
            self::CATEGORY_MAGAZINES,
            self::CATEGORY_MEDITATION,
            self::CATEGORY_LESSON,
            self::CATEGORY_EGW,
        ];
    }

    /** Categorias disponíveis no CRUD manual da igreja (sem EGW global). */
    public static function churchManagedCategories(): array
    {
        return [
            self::CATEGORY_BOOKS,
            self::CATEGORY_MAGAZINES,
        ];
    }

    /** Categorias em que a publicação pode ser PDF ou link externo (um dos dois). */
    public static function categoryAllowsExternalUrl(string $category): bool
    {
        return in_array($category, [
            self::CATEGORY_MEDITATION,
            self::CATEGORY_LESSON,
        ], true);
    }
}
