<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TalentReview extends Model
{
    public const STATUS_VISIBLE = 'visible';

    public const STATUS_HIDDEN = 'hidden';

    protected $fillable = [
        'listing_id',
        'interest_id',
        'reviewer_user_id',
        'reviewed_user_id',
        'rating',
        'comment',
        'status',
        'moderated_by',
        'moderated_at',
    ];

    protected $casts = [
        'rating' => 'integer',
        'moderated_at' => 'datetime',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(TalentListing::class, 'listing_id');
    }

    public function interest(): BelongsTo
    {
        return $this->belongsTo(TalentInterest::class, 'interest_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }

    public function reviewed(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_user_id');
    }
}
