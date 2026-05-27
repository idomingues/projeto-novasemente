<?php

namespace App\Models;

use App\Models\Concerns\Publishable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    use Publishable;

    public const VIDEO_YOUTUBE = 'youtube';

    public const VIDEO_INSTAGRAM = 'instagram';

    protected $fillable = [
        'church_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'published_at',
        'all_day',
        'location',
        'price',
        'purchase_url',
        'video_type',
        'video_url',
        'image_url',
        'is_active',
        'color',
        'created_by',
    ];

    protected $appends = [
        'youtube_embed_url',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'published_at' => 'datetime',
        'all_day' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        if ($this->video_type !== self::VIDEO_YOUTUBE || empty($this->video_url)) {
            return null;
        }
        $id = Musica::youtubeVideoId((string) $this->video_url);

        return $id ? "https://www.youtube.com/embed/{$id}" : null;
    }

    /** URL externa do vídeo (YouTube ou Instagram), para abrir na app. */
    public function resolvedVideoExternalUrl(): ?string
    {
        $url = trim((string) ($this->video_url ?? ''));
        if ($url === '' || ! in_array($this->video_type, [self::VIDEO_YOUTUBE, self::VIDEO_INSTAGRAM], true)) {
            return null;
        }

        return $url;
    }
}
