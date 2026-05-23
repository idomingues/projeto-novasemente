<?php

namespace App\Models;

use App\Support\SharedTalentEnrollmentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SharedTalentEnrollment extends Model
{
    public const STATUS_ENROLLED = 'enrolled';

    public const STATUS_AWAITING_APPROVAL = 'awaiting_approval';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'listing_id',
        'user_id',
        'message',
        'status',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(SharedTalentListing::class, 'listing_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SharedTalentEnrollmentMessage::class, 'enrollment_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(SharedTalentReview::class, 'enrollment_id');
    }

    public static function statusLabel(string $status): string
    {
        return SharedTalentEnrollmentStatus::label($status);
    }
}
