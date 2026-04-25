<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Musica extends Model
{
    protected $table = 'musicas';

    protected $fillable = [
        'church_id',
        'title',
        'youtube_url',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    protected $appends = ['youtube_embed_url', 'youtube_thumb_url'];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Sem data de publicação, ou data no passado ou presente. Exclui agendados para o futuro.
     */
    public function scopeVisibleInApp($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('published_at')
                ->orWhere('published_at', '<=', now());
        });
    }

    public static function youtubeVideoId(string $url): ?string
    {
        if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Extrai o parâmetro list= de URLs de playlist ou de vídeo com playlist (YouTube).
     */
    public static function youtubePlaylistIdFromUrl(string $url): ?string
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return null;
        }
        if (preg_match('/[?&]list=([a-zA-Z0-9_-]+)/', $trimmed, $m)) {
            $id = $m[1];

            return $id !== '' ? $id : null;
        }

        return null;
    }

    public static function canonicalYoutubeWatchUrl(string $videoId): string
    {
        return 'https://www.youtube.com/watch?v='.$videoId;
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        $id = self::youtubeVideoId($this->youtube_url);

        return $id ? "https://www.youtube.com/embed/{$id}" : null;
    }

    public function getYoutubeThumbUrlAttribute(): ?string
    {
        $id = self::youtubeVideoId($this->youtube_url);

        return $id ? "https://img.youtube.com/vi/{$id}/mqdefault.jpg" : null;
    }
}
