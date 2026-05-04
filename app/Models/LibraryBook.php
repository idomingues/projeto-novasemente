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

    protected $fillable = [
        'church_id',
        'title',
        'subtitle',
        'description',
        'category',
        'cover_path',
        'pdf_path',
        'published_at',
        'order',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
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
        ];
    }
}
