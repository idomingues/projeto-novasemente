<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoAlbum extends Model
{
    protected $table = 'photo_albums';

    protected $fillable = [
        'church_id',
        'title',
        'drive_folder_url',
        'cover_image_url',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    protected $appends = ['drive_folder_id', 'drive_folder_embed_url', 'drive_folder_view_url'];

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

    /**
     * Extrai o ID de pasta de um link do Google Drive.
     *
     * Aceita: https://drive.google.com/drive/folders/<id>
     *         https://drive.google.com/open?id=<id>
     */
    public static function driveFolderIdFromUrl(string $url): ?string
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('~drive\.google\.com/drive/folders/([a-zA-Z0-9_-]+)~', $trimmed, $m)) {
            return $m[1] ?: null;
        }

        if (preg_match('~[?&]id=([a-zA-Z0-9_-]+)~', $trimmed, $m)) {
            return $m[1] ?: null;
        }

        return null;
    }

    public function getDriveFolderIdAttribute(): ?string
    {
        return self::driveFolderIdFromUrl((string) ($this->drive_folder_url ?? ''));
    }

    public function getDriveFolderEmbedUrlAttribute(): ?string
    {
        $id = $this->drive_folder_id;
        if (! $id) {
            return null;
        }

        return "https://drive.google.com/embeddedfolderview?id={$id}#grid";
    }

    public function getDriveFolderViewUrlAttribute(): ?string
    {
        $id = $this->drive_folder_id;
        if (! $id) {
            return null;
        }

        return "https://drive.google.com/drive/folders/{$id}";
    }
}

