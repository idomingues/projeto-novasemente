<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TalentReport extends Model
{
    public const REASON_INAPPROPRIATE_CONTENT = 'inappropriate_content';

    public const REASON_IMPROPER_SERVICE = 'improper_service';

    public const REASON_FALSE_INFO = 'false_info';

    public const REASON_COMMERCIAL_ABUSE = 'commercial_abuse';

    public const REASON_INAPPROPRIATE_CONDUCT = 'inappropriate_conduct';

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
        return $this->belongsTo(TalentListing::class, 'listing_id');
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
            self::REASON_IMPROPER_SERVICE => 'Serviço impróprio',
            self::REASON_FALSE_INFO => 'Informação falsa',
            self::REASON_COMMERCIAL_ABUSE => 'Abuso comercial',
            self::REASON_INAPPROPRIATE_CONDUCT => 'Conduta inadequada',
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
