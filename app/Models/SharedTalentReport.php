<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedTalentReport extends Model
{
    public const REASON_INAPPROPRIATE_CONTENT = 'inappropriate_content';

    public const REASON_IMPROPER_CONDUCT = 'improper_conduct';

    public const REASON_COMMERCIAL_PROMOTION = 'commercial_promotion';

    public const REASON_FALSE_INFO = 'false_info';

    public const REASON_OTHER = 'other';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REVIEWING = 'reviewing';

    public const STATUS_RESOLVED = 'resolved';

    public const STATUS_DISMISSED = 'dismissed';

    protected $fillable = [
        'church_id',
        'reporter_user_id',
        'listing_id',
        'reported_user_id',
        'reason',
        'description',
        'status',
        'resolved_by',
        'resolved_at',
        'resolution_notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_user_id');
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(SharedTalentListing::class, 'listing_id');
    }

    public function reportedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public static function reasonLabel(string $reason): string
    {
        return match ($reason) {
            self::REASON_INAPPROPRIATE_CONTENT => 'Conteúdo inadequado',
            self::REASON_IMPROPER_CONDUCT => 'Comportamento impróprio',
            self::REASON_COMMERCIAL_PROMOTION => 'Propaganda comercial',
            self::REASON_FALSE_INFO => 'Informação falsa',
            self::REASON_OTHER => 'Outro',
            default => $reason,
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_PENDING => 'Pendente',
            self::STATUS_REVIEWING => 'Em análise',
            self::STATUS_RESOLVED => 'Resolvida',
            self::STATUS_DISMISSED => 'Arquivada',
            default => $status,
        };
    }
}
