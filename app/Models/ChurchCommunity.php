<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChurchCommunity extends Model
{
    protected $fillable = [
        'church_id',
        'name',
        'description',
        'whatsapp_url',
        'cover_path',
        'sort_order',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function resolvedCoverUrl(?string $baseUrl = null): ?string
    {
        $path = $this->cover_path;
        if (! is_string($path) || $path === '') {
            return null;
        }
        if (str_starts_with($path, 'http')) {
            return $path;
        }

        $mediaPath = route('media.public', ['path' => $path], absolute: false);

        if (is_string($baseUrl) && $baseUrl !== '') {
            return rtrim($baseUrl, '/').$mediaPath;
        }

        return $mediaPath;
    }

    public static function normalizeWhatsappUrl(?string $url): ?string
    {
        if (! is_string($url)) {
            return null;
        }
        $url = trim($url);
        if ($url === '') {
            return null;
        }
        $parsed = parse_url($url);
        if (! is_array($parsed) || empty($parsed['scheme']) || empty($parsed['host'])) {
            return null;
        }
        $host = strtolower($parsed['host']);
        if (! in_array($host, ['chat.whatsapp.com', 'wa.me', 'api.whatsapp.com'], true)) {
            return null;
        }

        return $url;
    }
}
