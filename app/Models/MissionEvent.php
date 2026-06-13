<?php

namespace App\Models;

use App\Support\MissionCalendar2026Installer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionEvent extends Model
{
    public const VIDEO_YOUTUBE = 'youtube';

    public const VIDEO_INSTAGRAM = 'instagram';

    protected $fillable = [
        'church_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'all_day',
        'location',
        'price',
        'purchase_url',
        'video_type',
        'video_url',
        'image_url',
        'color',
        'created_by',
    ];

    protected $appends = [
        'youtube_embed_url',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'all_day' => 'boolean',
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

    /** @param  Builder<self>  $query */
    public function scopeUpcoming(Builder $query): Builder
    {
        $now = now();

        return $query->where(function ($q) use ($now) {
            $q->where(function ($inner) use ($now) {
                $inner->whereNotNull('ends_at')->where('ends_at', '>=', $now);
            })->orWhere(function ($inner) use ($now) {
                $inner->whereNull('ends_at')->where('starts_at', '>=', $now->copy()->startOfDay());
            });
        });
    }

    /** Agenda missionária jun–dez/2026 (pacote instalável). */
    /** @param  Builder<self>  $query */
    public function scopeMissionCalendar2026(Builder $query): Builder
    {
        return $query->whereBetween('starts_at', [
            \Carbon\Carbon::parse(MissionCalendar2026Installer::CALENDAR_START)->startOfDay(),
            \Carbon\Carbon::parse(MissionCalendar2026Installer::CALENDAR_END)->endOfDay(),
        ]);
    }
}
