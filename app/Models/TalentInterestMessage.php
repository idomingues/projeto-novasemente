<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TalentInterestMessage extends Model
{
    protected $fillable = [
        'interest_id',
        'user_id',
        'body',
    ];

    public function interest(): BelongsTo
    {
        return $this->belongsTo(TalentInterest::class, 'interest_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
