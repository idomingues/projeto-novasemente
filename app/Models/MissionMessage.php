<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionMessage extends Model
{
    public const STATUS_PUBLISHED = 'published';

    public const STATUS_PENDING_REVIEW = 'pending_review';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'church_id',
        'user_id',
        'body',
        'is_hidden',
        'is_team_highlight',
        'moderation_status',
        'moderation_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
        'is_team_highlight' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeVisible($query)
    {
        return $query
            ->where('is_hidden', false)
            ->where('moderation_status', self::STATUS_PUBLISHED);
    }

    public function scopePendingReview($query)
    {
        return $query->where('moderation_status', self::STATUS_PENDING_REVIEW);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_PENDING_REVIEW => 'Aguardando análise',
            self::STATUS_REJECTED => 'Não publicado',
            default => 'Publicado',
        };
    }
}
