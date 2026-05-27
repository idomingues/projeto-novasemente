<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class PrayerRequest extends Model
{
    protected $table = 'prayer_requests';

    protected $fillable = [
        'church_id',
        'user_id',
        'name_or_nickname',
        'request',
        'prayer_amen_count',
        'active',
        'needs_review',
        'moderation_note',
    ];

    protected $casts = [
        'active' => 'boolean',
        'needs_review' => 'boolean',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
