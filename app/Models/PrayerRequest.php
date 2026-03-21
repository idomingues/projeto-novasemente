<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrayerRequest extends Model
{
    protected $table = 'prayer_requests';

    protected $fillable = [
        'church_id',
        'name_or_nickname',
        'request',
        'prayer_amen_count',
    ];

    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }
}
