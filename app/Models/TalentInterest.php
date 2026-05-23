<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TalentInterest extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_IN_CONVERSATION = 'in_conversation';

    public const STATUS_AGREED = 'agreed';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'listing_id',
        'user_id',
        'message',
        'status',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(TalentListing::class, 'listing_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TalentInterestMessage::class, 'interest_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(TalentReview::class, 'interest_id');
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_PENDING => 'Pendente',
            self::STATUS_IN_CONVERSATION => 'Em conversa',
            self::STATUS_AGREED => 'Combinado',
            self::STATUS_COMPLETED => 'Concluído',
            self::STATUS_CANCELLED => 'Cancelado',
            default => $status,
        };
    }
}
