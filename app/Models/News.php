<?php

namespace App\Models;

use App\Support\StorageUrl;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class News extends Model
{
    public const TYPE_ARTICLE = 'article';

    public const TYPE_YOUTUBE = 'youtube';

    public const TYPE_PDF = 'pdf';

    public const TYPE_IMAGE = 'image';

    /** Publicação estilo feed (imagem + legenda), listada em coluna no app. */
    public const TYPE_INSTAGRAM_FEED = 'instagram_feed';

    protected $fillable = [
        'church_id',
        'title',
        'slug',
        'content_type',
        'excerpt',
        'body',
        'youtube_url',
        'pdf_path',
        'image_url',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    protected $appends = [
        'youtube_embed_url',
        'youtube_thumb_url',
    ];

    protected function imageUrl(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if (empty($value)) {
                    return null;
                }
                if (str_starts_with($value, '/')) {
                    return $value;
                }
                if (preg_match('#^https?://[^/]+(/storage/.*)$#', $value, $m)) {
                    return $m[1];
                }

                return $value;
            },
        );
    }

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function youtubeVideoId(): ?string
    {
        return Musica::youtubeVideoId((string) ($this->youtube_url ?? ''));
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        if ($this->content_type !== self::TYPE_YOUTUBE || empty($this->youtube_url)) {
            return null;
        }
        $id = $this->youtubeVideoId();

        return $id ? "https://www.youtube.com/embed/{$id}" : null;
    }

    public function getYoutubeThumbUrlAttribute(): ?string
    {
        if ($this->content_type !== self::TYPE_YOUTUBE || empty($this->youtube_url)) {
            return null;
        }
        $id = $this->youtubeVideoId();

        return $id ? "https://img.youtube.com/vi/{$id}/mqdefault.jpg" : null;
    }

    /** URL absoluta para capa em listas (imagem própria ou miniatura do YouTube). */
    public function resolvedCoverUrl(string $baseUrl): ?string
    {
        $img = $this->image_url;
        if ($img) {
            if (! str_starts_with($img, 'http')) {
                return $baseUrl.$img;
            }

            return $img;
        }

        return $this->youtube_thumb_url;
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
}
