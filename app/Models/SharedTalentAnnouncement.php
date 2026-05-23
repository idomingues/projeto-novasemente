<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedTalentAnnouncement extends Model
{
    protected $fillable = [
        'listing_id',
        'user_id',
        'body',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(SharedTalentListing::class, 'listing_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
