<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionWallItem extends Model
{
    protected $fillable = [
        'church_id',
        'title',
        'photographer_name',
        'drive_folder_url',
        'cover_image_url',
        'sort_order',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function scopeVisibleInApp($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('published_at')
                ->orWhere('published_at', '<=', now());
        });
    }

    public function getDriveFolderIdAttribute(): ?string
    {
        return PhotoAlbum::driveFolderIdFromUrl((string) ($this->drive_folder_url ?? ''));
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
