<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionTripRegistration extends Model
{
    public const TRIP_THAILAND_MYANMAR_2026 = 'thailand-myanmar-2026';

    protected $fillable = [
        'church_id',
        'user_id',
        'trip_slug',
        'full_name',
        'instagram',
        'phone',
        'email',
        'has_passport',
        'participated_foreign_mission_before',
        'profession',
        'profession_other',
    ];

    protected $casts = [
        'has_passport' => 'boolean',
        'participated_foreign_mission_before' => 'boolean',
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
